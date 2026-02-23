from __future__ import annotations

import os

from pymongo import MongoClient

_client: MongoClient | None = None


def get_db():
    global _client

    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB_NAME")

    if not uri:
        raise RuntimeError("Missing environment variable: MONGODB_URI")
    if not db_name:
        raise RuntimeError("Missing environment variable: MONGODB_DB_NAME")

    if _client is None:
        _client = MongoClient(uri)

    return _client[db_name]
