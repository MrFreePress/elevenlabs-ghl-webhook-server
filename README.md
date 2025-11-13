# --------------------------
# Server Configuration
# --------------------------
# Required only for local development (e.g., http://localhost:8080)
# Hosting platforms like Render/Railway automatically set the PORT.
PORT=8080

# production = live environment  
# development = local testing environment
NODE_ENV=production


# --------------------------
# GoHighLevel (GHL) API Configuration
# --------------------------
# GHL API Key used for creating/updating contacts and adding notes
GHL_API_KEY=YOUR_GHL_API_KEY_HERE

# The Location ID associated with your GHL account
GHL_LOCATION_ID=YOUR_GHL_LOCATION_ID_HERE


# --------------------------
# ElevenLabs Configuration
# --------------------------
# ElevenLabs API Key — optional but recommended
ELEVEN_API_KEY=YOUR_ELEVENLABS_API_KEY_HERE

# ElevenLabs Agent ID (depends on your EL configuration)
ELEVEN_AGENT_ID=YOUR_AGENT_ID_HERE


# --------------------------
# Logging Settings
# --------------------------
# info = standard logs
# debug = more detailed logs
LOG_LEVEL=info

# Directory where log files will be stored
LOG_DIR=logs
