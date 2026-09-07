#!/usr/bin/env python3
"""Build a prefilled GitHub "compare" URL for opening a pull request.

Used by the create-pr skill as the fallback when the `gh` CLI is not available.
The resulting URL opens GitHub's PR-creation page with the base branch, head
branch, title, and body pre-filled — nothing is submitted and no credentials
are involved; the user reviews and clicks "Create pull request".

Example:
    python build_compare_url.py \
        --owner RightShip-Tech --repo fleet-focus-app \
        --base story/squad3/ET3-6100 --head subtask/squad3/ET3-6112 \
        --title "ET3-6112 Fix incompatible time-range popup" \
        --body "Fixes the NaN trend label on the fleet map.

https://rightship.atlassian.net/browse/ET3-6112"
"""
import argparse
from urllib.parse import quote


def build_compare_url(owner, repo, base, head, title=None, body=None):
    # GitHub matches branches by name within the same repo, so head is just the
    # branch name (no owner: prefix needed for same-repo PRs). Path segments of
    # the ref are kept as-is except '#' and '?' which would break the URL.
    def seg(ref):
        return quote(ref, safe="/")

    url = f"https://github.com/{owner}/{repo}/compare/{seg(base)}...{seg(head)}?expand=1"
    if title:
        url += "&title=" + quote(title, safe="")
    if body:
        url += "&body=" + quote(body, safe="")
    return url


def main():
    p = argparse.ArgumentParser(description="Build a prefilled GitHub compare/PR URL.")
    p.add_argument("--owner", required=True, help="e.g. RightShip-Tech")
    p.add_argument("--repo", required=True, help="e.g. fleet-focus-app")
    p.add_argument("--base", required=True, help="target/base branch the PR merges INTO")
    p.add_argument("--head", required=True, help="source/head branch (your branch)")
    p.add_argument("--title", default=None, help="PR title (lead with the Jira key)")
    p.add_argument("--body", default=None, help="PR body")
    args = p.parse_args()
    print(build_compare_url(args.owner, args.repo, args.base, args.head, args.title, args.body))


if __name__ == "__main__":
    main()
