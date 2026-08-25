# tests/README.md

This directory contains quick instructions to test a Bluesminds API key locally.

1) Export the key (Linux / macOS / Git Bash):

   export BLUESMINDS_KEY="sk-..."

2) Run the listing script to see what /keys returns:

   python3 seo_agent_pro/bluesminds_list_models.py

3) If you get model identifiers from the provider, set BLUESMINDS_MODEL and run a small completion test:

   export BLUESMINDS_MODEL="<model_id>"
   python3 seo_agent_pro/bluesminds_test_completion.py

Notes:
- Do NOT commit your BLUESMINDS_KEY to git. Keep it in environment variables.
- Delete or rotate the key when finished testing.
