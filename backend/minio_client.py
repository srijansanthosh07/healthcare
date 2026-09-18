import os
import io
import logging
import boto3
from botocore.client import Config
from config import settings

logger = logging.getLogger("medtimeline.minio")

class StorageClient:
    def __init__(self):
        self.endpoint = settings.MINIO_ENDPOINT
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self.use_local_fallback = False

        endpoint_url = f"http://{self.endpoint}" if not self.endpoint.startswith("http") else self.endpoint
        try:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.MINIO_ROOT_USER,
                aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
                config=Config(signature_version='s3v4'),
                region_name='us-east-1'
            )
            self._ensure_bucket()
        except Exception as e:
            logger.warning(f"Could not connect to MinIO S3 at {endpoint_url}: {e}. Enabling local disk storage fallback.")
            self.use_local_fallback = True
            self.local_dir = os.path.abspath("./local_storage")
            os.makedirs(self.local_dir, exist_ok=True)

    def _ensure_bucket(self):
        try:
            buckets = self.s3_client.list_buckets()
            bucket_names = [b['Name'] for b in buckets.get('Buckets', [])]
            if self.bucket_name not in bucket_names:
                logger.info(f"Creating MinIO bucket: {self.bucket_name}")
                self.s3_client.create_bucket(Bucket=self.bucket_name)
        except Exception as e:
            logger.warning(f"Bucket verification failed: {e}. Enabling local disk fallback.")
            self.use_local_fallback = True
            self.local_dir = os.path.abspath("./local_storage")
            os.makedirs(self.local_dir, exist_ok=True)

    def upload_file_bytes(self, storage_key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Uploads file bytes to S3 object storage with Server-Side Encryption (AES256) (FR-28).
        """
        if self.use_local_fallback:
            file_path = os.path.join(self.local_dir, storage_key)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(data)
            return storage_key

        put_args = {
            "Bucket": self.bucket_name,
            "Key": storage_key,
            "Body": data,
            "ContentType": content_type
        }

        # Enforce Server-Side Encryption at Rest (FR-28)
        if settings.ENABLE_S3_SERVER_SIDE_ENCRYPTION:
            put_args["ServerSideEncryption"] = "AES256"

        self.s3_client.put_object(**put_args)
        return storage_key

    def get_file_bytes(self, storage_key: str) -> bytes:
        if self.use_local_fallback:
            file_path = os.path.join(self.local_dir, storage_key)
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File {storage_key} not found in local storage.")
            with open(file_path, "rb") as f:
                return f.read()

        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=storage_key)
        return response['Body'].read()

storage_client = StorageClient()
