#!/bin/bash
xcrun altool --notarization-history 0 -u paul@terra.money -p "${NOTARIZE_PASSWORD}"
