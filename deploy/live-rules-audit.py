#!/usr/bin/env python3
"""Fail-closed audit of currently deployed Clipi Firestore rules.
Requires the GitHub Actions service-account secret; never prints rule content.
"""
import argparse, hashlib, json, os, pathlib, sys
import google.auth
from google.auth.transport.requests import Request
import requests

PROJECT = "clipi-f67c0"
BASE = "https://firebaserules.googleapis.com/v1"

def normalize(source):
    return "\n".join(line.rstrip() for line in source.strip().splitlines()).strip()

def sha(value):
    return hashlib.sha256(normalize(value).encode("utf-8")).hexdigest()

def fetch_live():
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(Request())
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {creds.token}"
    def get(endpoint):
        response = session.get(f"{BASE}/{endpoint}", timeout=25)
        response.raise_for_status()
        return response.json()
    release = get(f"projects/{PROJECT}/releases/cloud.firestore")
    ruleset_name = release.get("rulesetName", "")
    if not ruleset_name.startswith(f"projects/{PROJECT}/rulesets/"):
        raise RuntimeError("Unexpected project or ruleset. Refusing to deploy.")
    ruleset = get(ruleset_name)
    files = ruleset.get("source", {}).get("files", [])
    if len(files) != 1 or not isinstance(files[0].get("content"), str):
        raise RuntimeError("Unknown live rules file layout. Refusing to deploy.")
    return files[0]["content"], ruleset_name

def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["audit", "verify"])
    p.add_argument("--candidate", required=True)
    p.add_argument("--legacy")
    p.add_argument("--mvp")
    p.add_argument("--backup")
    a = p.parse_args()
    desired = pathlib.Path(a.candidate).read_text()
    live, release = fetch_live()
    label = "candidate" if sha(live) == sha(desired) else "unrecognized"
    if a.legacy and sha(live) == sha(pathlib.Path(a.legacy).read_text()):
        label = "legacy"
    if a.mvp and sha(live) == sha(pathlib.Path(a.mvp).read_text()):
        label = "mvp"
    print(f"Firebase project: {PROJECT}; live release: {release}; live rules SHA256: {sha(live)}; match: {label}")
    if a.mode == "audit":
        if a.backup:
            pathlib.Path(a.backup).write_text(live)
            os.chmod(a.backup, 0o600)
        if label not in ("candidate", "legacy", "mvp"):
            raise RuntimeError("Live rules differ from every reviewed baseline. ABORT: no deployment.")
        print("Audit passed: live release matches an approved known Clipi rules version.")
    else:
        if sha(live) != sha(desired):
            raise RuntimeError("Deployment verification failed: live rules do not match expected candidate.")
        print("Verified: Firestore live release equals tested Clipi candidate.")
if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Firestore audit blocked: {exc}", file=sys.stderr)
        sys.exit(1)
