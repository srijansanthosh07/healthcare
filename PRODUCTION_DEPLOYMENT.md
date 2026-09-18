# MedTimeline — Production Deployment Guide

This document describes how the local `docker-compose.yml` services map to a
production container-orchestrator setup (AWS ECS or Kubernetes), with all secrets
extracted from `.env` and managed securely.

---

## Local → Production Service Mapping

| `docker-compose.yml` Service | Production Equivalent |
|---|---|
| `db` (postgres:16) | AWS RDS PostgreSQL 16 **or** Google Cloud SQL PostgreSQL 16 |
| `redis` (redis:7) | AWS ElastiCache Redis **or** Upstash Redis (serverless) |
| `minio` | AWS S3 **or** MinIO on persistent block storage (EBS/PVC) |
| `api` (FastAPI) | ECS Fargate Task **or** Kubernetes Deployment (≥2 replicas) |
| `worker` (RQ Worker) | ECS Fargate Task **or** Kubernetes Deployment (≥1 replica, auto-scales) |
| `frontend` (Vite/React) | CloudFront + S3 static hosting **or** Nginx on K8s Ingress |

---

## Secrets Management (No `.env` in Production)

> [!CAUTION]
> Never ship the `.env` file to a production image or commit it to source control.

### AWS ECS — AWS Secrets Manager

```yaml
# ECS Task Definition (JSON excerpt)
{
  "secrets": [
    { "name": "POSTGRES_PASSWORD",  "valueFrom": "arn:aws:secretsmanager:region:acct:secret:medtimeline/db_password" },
    { "name": "JWT_SECRET",         "valueFrom": "arn:aws:secretsmanager:region:acct:secret:medtimeline/jwt_secret" },
    { "name": "GEMINI_API_KEY",     "valueFrom": "arn:aws:secretsmanager:region:acct:secret:medtimeline/gemini_key" },
    { "name": "MINIO_ROOT_PASSWORD","valueFrom": "arn:aws:secretsmanager:region:acct:secret:medtimeline/minio_pass" }
  ]
}
```

### Kubernetes — Sealed Secrets or External Secrets Operator

```yaml
# k8s/secret.yaml (created via: kubectl create secret generic medtimeline-secrets --from-env-file=.env --dry-run=client -o yaml | kubeseal)
apiVersion: v1
kind: Secret
metadata:
  name: medtimeline-secrets
  namespace: medtimeline
type: Opaque
stringData:
  POSTGRES_PASSWORD: "<from-vault-or-sealed>"
  JWT_SECRET: "<from-vault-or-sealed>"
  GEMINI_API_KEY: "<from-vault-or-sealed>"
  MINIO_ROOT_PASSWORD: "<from-vault-or-sealed>"
```

---

## Kubernetes Deployment (Recommended)

### Namespace

```bash
kubectl create namespace medtimeline
```

### API Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medtimeline-api
  namespace: medtimeline
spec:
  replicas: 2                         # Horizontal scale: stateless FastAPI
  selector:
    matchLabels:
      app: medtimeline-api
  template:
    metadata:
      labels:
        app: medtimeline-api
    spec:
      containers:
      - name: api
        image: <your-registry>/medtimeline-api:latest
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: medtimeline-secrets
        env:
        - name: POSTGRES_HOST
          value: "<rds-endpoint-or-db-service>"
        - name: REDIS_HOST
          value: "<elasticache-or-redis-service>"
        - name: MINIO_ENDPOINT
          value: "<s3-endpoint-or-minio-service>"
        - name: DB_SSL_MODE
          value: "require"             # Enforce TLS for DB connections (FR-28)
        - name: MINIO_SECURE
          value: "true"               # Enforce TLS for S3 connections (FR-28)
        resources:
          requests: { cpu: "250m", memory: "512Mi" }
          limits:   { cpu: "1",    memory: "1Gi" }
        livenessProbe:
          httpGet: { path: "/", port: 8000 }
          initialDelaySeconds: 15
          periodSeconds: 30
        readinessProbe:
          httpGet: { path: "/", port: 8000 }
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: medtimeline-api-svc
  namespace: medtimeline
spec:
  selector:
    app: medtimeline-api
  ports:
  - port: 80
    targetPort: 8000
```

### Worker Deployment (Stateless, Horizontally Scalable)

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medtimeline-worker
  namespace: medtimeline
spec:
  replicas: 2                         # Scale workers independently from API
  selector:
    matchLabels:
      app: medtimeline-worker
  template:
    metadata:
      labels:
        app: medtimeline-worker
    spec:
      containers:
      - name: worker
        image: <your-registry>/medtimeline-api:latest   # Same image, different command
        command: ["python", "worker.py"]
        envFrom:
        - secretRef:
            name: medtimeline-secrets
        env:
        - name: POSTGRES_HOST
          value: "<rds-endpoint-or-db-service>"
        - name: REDIS_HOST
          value: "<elasticache-or-redis-service>"
        - name: MINIO_ENDPOINT
          value: "<s3-endpoint>"
        - name: MINIO_SECURE
          value: "true"
        resources:
          requests: { cpu: "500m", memory: "1Gi" }
          limits:   { cpu: "2",    memory: "4Gi" }
```

### KEDA Auto-Scaler (Scale workers based on Redis queue depth)

```yaml
# k8s/worker-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: medtimeline-worker-scaler
  namespace: medtimeline
spec:
  scaleTargetRef:
    name: medtimeline-worker
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: redis
    metadata:
      address: "<elasticache-host>:6379"
      listName: "rq:queue:default"
      listLength: "5"          # 1 extra worker per 5 queued jobs
```

### Ingress (TLS Termination)

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: medtimeline-ingress
  namespace: medtimeline
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts: ["api.medtimeline.example.com"]
    secretName: medtimeline-tls
  rules:
  - host: api.medtimeline.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: medtimeline-api-svc
            port: { number: 80 }
```

---

## AWS ECS Fargate (Alternative)

```bash
# Build & Push Images
docker build -t medtimeline-api ./backend
docker tag medtimeline-api:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/medtimeline-api:latest
aws ecr get-login-password | docker login --username AWS --password-stdin <aws-account>.dkr.ecr.<region>.amazonaws.com
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/medtimeline-api:latest

# Create ECS cluster
aws ecs create-cluster --cluster-name medtimeline-prod

# Register Task Definitions (api + worker)
# See: /deployment/ecs-task-api.json and /deployment/ecs-task-worker.json
# (Replace image URIs and secret ARNs)

# Create ECS Services (with ALB for API, no ALB for worker)
aws ecs create-service \
  --cluster medtimeline-prod \
  --service-name medtimeline-api \
  --task-definition medtimeline-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

---

## Production Security Checklist (FR-27 to FR-30)

| Requirement | Implementation | Status |
|---|---|---|
| **FR-27** Jurisdiction neutrality | All privacy rules in `.env` (`JURISDICTION_CODE`, `DATA_RETENTION_POLICY`) | ✅ No hardcoded HIPAA/GDPR |
| **FR-28** Encryption at rest | S3 `ServerSideEncryption=AES256`; RDS encryption enabled at creation | ✅ |
| **FR-28** Encryption in transit | `DB_SSL_MODE=require`; `MINIO_SECURE=true`; TLS via Ingress/ALB | ✅ |
| **FR-29** Immediate revocation | `access_control.py` queries DB live — no caching layer | ✅ Zero stale state |
| **FR-29** Expiry enforcement | Expired grants auto-set to `status='expired'` on next access attempt | ✅ |
| **FR-30** Additive immutability | No `DELETE`/overwrite code paths for documents, extractions, events | ✅ Append-only |
| Horizontal worker scale | Stateless RQ workers; API stateless FastAPI behind load balancer | ✅ |
| Secrets | AWS Secrets Manager / K8s Sealed Secrets — zero `.env` in production | ✅ |
| Audit trail | Every data access writes `audit_logs` via mandatory middleware | ✅ |

---

## Environment Variables Reference

All variables below must be supplied via your secrets manager in production (never a `.env` file):

| Variable | Description | Production Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Point to RDS endpoint with `sslmode=require` |
| `REDIS_URL` | Redis connection string | ElastiCache endpoint |
| `MINIO_ENDPOINT` | S3 or MinIO endpoint | AWS S3 or MinIO service host |
| `MINIO_SECURE` | Enable TLS for S3 | `true` |
| `ENABLE_S3_SERVER_SIDE_ENCRYPTION` | AES256 server-side encryption | `true` |
| `DB_SSL_MODE` | PostgreSQL SSL mode | `require` |
| `JWT_SECRET` | JWT signing secret (≥256-bit random) | From Secrets Manager |
| `GEMINI_API_KEY` | Google Gemini OCR/NLP key | From Secrets Manager |
| `JURISDICTION_CODE` | Regional deployment code | e.g. `IN-DPDP`, `EU-GDPR`, `US-HIPAA` |
| `DATA_RETENTION_POLICY` | Data retention label | `ADDITIVE_PERPETUAL` or jurisdiction-specific |
| `DEFAULT_GRANT_EXPIRY_DAYS` | Doctor access grant lifetime | e.g. `30` |
| `EMERGENCY_EXPIRY_HOURS` | Emergency break-glass window | `24` |
