#!/bin/bash
set -e
echo "Installing FB Car Bot service..."
cp fb-car-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable fb-car-bot
systemctl start fb-car-bot
echo "Done. Monitor logs with: journalctl -u fb-car-bot -f"
