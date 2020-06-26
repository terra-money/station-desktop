#!/bin/bash
xcrun altool --notarization-history 0 -u engineering@terra.money -p "${NOTARIZE_PASSWORD}"
