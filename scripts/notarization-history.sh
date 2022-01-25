#!/bin/bash
xcrun altool --notarization-history 0 -u ${NOTARIZE_USER} -p "${NOTARIZE_PASSWORD}"
