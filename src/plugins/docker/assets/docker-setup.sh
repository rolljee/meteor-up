#!/bin/bash

# TODO make sure we can run docker in this server

<% include install-docker.sh %>

minimumMajor=1
minimumMinor=13

# Is docker already installed?
set +e
hasDocker=$(sudo docker version | grep "version")
serverVersion=$(sudo docker version --format '{{.Server.Version}}')
parsedVersion=( ${serverVersion//./ })
majorVersion="${parsedVersion[0]}"
minorVersion="${parsedVersion[1]}"
echo $serverVersion
echo "Major" $majorVersion
echo "Minor" $minorVersion
set -e

if [ ! "$hasDocker" ]; then
  install_docker

elif [ "$minimumMajor" -gt "$majorVersion" ]; then
  echo "major wrong"
  install_docker

elif [ "$minimumMajor" -eq "$majorVersion" ] && [ "$minimumMinor" -gt "$minorVersion" ]; then
  echo "minor wrong"
  install_docker
else
  # Start docker if it was stopped. If docker is already running, the exit code is 1
  sudo service docker start || true
fi

# TODO make sure docker works as expected
