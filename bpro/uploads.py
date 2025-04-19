#!/usr/bin/env python3
#Author: Paul Estrada
#Email: paul257@ohs.stanford.edu
#URL: https://github.com/r0adki110/pronto-selfbots

import pathlib
import mimetypes
import uuid
import requests
import time
import logging


class ProntoUploader:
    def __init__(
        self,
        token: str,
        bubble_id: int,
        base_url: str = "https://stanfordohs.pronto.io",
        log_level: int = logging.INFO,
    ):
        self.base_url = base_url.rstrip("/")
        self.bubble_id = bubble_id
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

        logging.basicConfig(
            level=log_level,
            format="%(asctime)s  %(levelname)-8s %(message)s",
            datefmt="%H:%M:%S",
        )
        self.log = logging.getLogger(self.__class__.__name__)

    def upload_file(self, path: str) -> dict:
        p = pathlib.Path(path)
        mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        size = p.stat().st_size
        url = f"{self.base_url}/api/files"
        params = {"filename": p.name, "normalize_image": "true"}
        headers = {**self.headers, "Content-Type": mime, "Content-Length": str(size)}

        with p.open("rb") as fh:
            r = requests.put(url, params=params, data=fh, headers=headers)
        r.raise_for_status()
        data = r.json()["data"]
        self.log.info("Uploaded %s → key=%s", p.name, data["key"])
        return data

    def wait_until_ready(
        self,
        orig_key: str,
        preset: str = "PHOTO",
        tries: int = 6,
        delay: float = 0.5,
    ) -> None:
        url = f"{self.base_url}/api/clients/files/{orig_key}/normalized"
        for attempt in range(1, tries + 1):
            r = requests.get(url, params={"preset": preset}, headers=self.headers)
            r.raise_for_status()
            if "normalized" in r.json().get("data", {}):
                self.log.info("✓ normalized (attempt %s)", attempt)
                return
            time.sleep(delay)
        self.log.warning("Normalization incomplete after %s attempts", tries)

    def create_message(
        self,
        orig_key: str,
        norm_key: str,
        meta: dict,
        text: str = "",
        media_type: str = "PHOTO",
        tries: int = 3,
    ) -> int:
        payload_stub = {"uuid": str(uuid.uuid4()), "bubble_id": self.bubble_id}
        url = f"{self.base_url}/api/v1/message.create"

        for attempt in range(1, tries + 1):
            payload = {
                **payload_stub,
                "message": text,
                "messagemedia": [
                    {
                        "mediatype": media_type,
                        "title": meta["name"],
                        "filesize": meta["filesize"],
                        "mimetype": meta["mimetype"],
                        "width": meta["width"],
                        "height": meta["height"],
                        "uuid": norm_key,
                    }
                ],
            }
            r = requests.post(url, json=payload, headers=self.headers)

            if r.status_code == 400 and "INVALID_ATTACHMENT_FILE_KEY" in r.text:
                self.log.warning(
                    "Key not ready (%s/%s), retrying…", attempt, tries
                )
                self.wait_until_ready(orig_key, tries=3, delay=0.7)
                continue

            r.raise_for_status()
            msg_id = r.json()["message"]["id"]
            self.log.info("✓ posted – message_id=%s", msg_id)
            return msg_id

        raise RuntimeError("Message creation failed after retries")

    def send(self, file_path: str, text: str = "") -> int:
        """
        Uploads a file, waits for normalization, and creates a message.
        Returns the message ID.
        """
        # 1. upload and determine original key
        info = self.upload_file(file_path)
        orig_key = info["key"]

        # 2. detect media category from local file or returned metadata
        mime = mimetypes.guess_type(file_path)[0] or ""
        category = mime.split("/", 1)[0]
        # map to Pronto preset/mediatype
        type_map = {"image": "PHOTO", "video": "VIDEO", "audio": "AUDIO"}
        preset = type_map.get(category, "PHOTO")

        # 3. wait for normalization under the chosen preset
        self.wait_until_ready(orig_key, preset=preset)

        # 4. fetch normalized metadata
        r = requests.get(
            f"{self.base_url}/api/clients/files/{orig_key}/normalized",
            params={"preset": preset},
            headers=self.headers,
        )
        r.raise_for_status()
        norm_data = r.json()["data"]["normalized"]

        # 5. prepare meta dict
        meta = {
            "name":     norm_data["name"],
            "filesize": norm_data["filesize"],
            "mimetype": norm_data["mimetype"],
            "width":    norm_data.get("width"),
            "height":   norm_data.get("height"),
        }

        # 6. create message with appropriate media_type
        return self.create_message(orig_key, norm_data["key"], meta, text, media_type=preset)


if __name__ == "__main__":
    # example usage
    TOKEN = "ur token here"
    BUBBLE_ID = "ur bubble id here"
    FILE_PATH = "path to local file here"

    uploader = ProntoUploader(token=TOKEN, bubble_id=BUBBLE_ID)
    try:
        message_id = uploader.send(FILE_PATH, text="testing image upload")
        print("Message sent, ID =", message_id)
    except requests.HTTPError as e:
        uploader.log.error("HTTP error: %s", e)
    except Exception as e:
        uploader.log.exception("Unexpected error: %s", e)
