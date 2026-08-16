#!/usr/bin/env python3
"""
Google Colab GPU Video Worker for YouTube Automation Studio
Dispatches hardware-accelerated video rendering tasks to our 4-account Google Colab GPU cluster
managed by `colab-pool` on the Linux server (64GB total VRAM across 4x NVIDIA T4 GPUs).
"""

import sys
import os
import json
import subprocess
import argparse

def run_on_colab_cluster(command_script, gpu_type="T4"):
    print(f"🚀 Dispatching rendering task to Google Colab {gpu_type} GPU cluster...")
    linux_host = os.getenv("LINUX_HOST", "joe@100.86.193.4")
    colab_pool_bin = "/home/joe/.local/bin/colab-pool"
    
    # Check if colab-pool is reachable
    check_cmd = f"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 {linux_host} '{colab_pool_bin} status --json'"
    try:
        res = subprocess.run(check_cmd, shell=True, capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            print("✅ Colab GPU Pool is ONLINE:")
            print(res.stdout)
        else:
            print("⚠️ Colab pool status check returned non-zero. Attempting execution...")
    except Exception as e:
        print(f"⚠️ Remote Colab pool unreachable: {e}. Falling back to local/cloud runner.")
        return False

    # Execute remote GPU task
    remote_cmd = f"ssh -o StrictHostKeyChecking=no {linux_host} \"{colab_pool_bin} run --gpu {gpu_type} '{command_script}'\""
    try:
        proc = subprocess.run(remote_cmd, shell=True, capture_output=True, text=True)
        print("Colab Output:")
        print(proc.stdout)
        if proc.stderr:
            print("Colab Logs:", proc.stderr)
        return proc.returncode == 0
    except Exception as e:
        print(f"❌ Error during Colab GPU task dispatch: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Colab GPU Video Worker")
    parser.add_argument("--script", required=True, help="Path to rendering script or shell command")
    parser.add_argument("--gpu", default="T4", help="GPU Type (default: T4)")
    args = parser.parse_args()

    success = run_on_colab_cluster(args.script, args.gpu)
    sys.exit(0 if success else 1)
