#!/bin/bash
set -e

echo "Waiting for MongoDB to accept connections..."
until mongosh --host mongodb --eval "db.adminCommand('ping')" --quiet 2>/dev/null; do
  sleep 2
done

echo "MongoDB is reachable. Initializing replica set..."

mongosh --host mongodb --quiet <<EOF
rs.initiate({
  _id: "rs0",
  version: 1,
  members: [
    { _id: 0, host: "mongodb:27017" }
  ]
})
EOF

echo "Waiting for replica set to elect a PRIMARY..."
until mongosh --host mongodb --eval "rs.status().ok" --quiet 2>/dev/null; do
  sleep 2
done

echo "MongoDB replica set 'rs0' initialized successfully!"
