#!/bin/bash
#set -ex
#set -x
if [ $# -eq 0 ] ; then
  echo "Usage: notarize.sh <dmg filename>"
  exit;
fi

if [ -z "$NOTARIZE_PASSWORD" ] ; then
  echo "NOTARIZE_PASSWORD environment variable must be assigned. e.g. NOTARIZE_PASSWORD=<password> ./build.sh <dmg filename>"
  exit;
fi

echo "Notarization request is starting. Please be patient."
xcrun altool --notarize-app -f "$1" --primary-bundle-id money.terra.station -u ${NOTARIZE_USER} -p "${NOTARIZE_PASSWORD}"
echo "Finished! Notarization result will be notified via e-mail after a few minutes."
