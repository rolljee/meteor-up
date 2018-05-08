import _ from 'lodash';
import debug from 'debug';
import { getOptions } from './swarm-options';

const log = debug('mup:swarm-utils');

export function hostsToServer(config, hosts) {
  const servers = config.servers;
  const result = [];

  Object.keys(servers).forEach(key => {
    const server = servers[key];

    if (hosts.indexOf(server.host) > -1) {
      result.push(key);
    }
  });

  return result;
}

export function currentManagers(config, serverInfo) {
  const hosts = [];

  // TODO: handle managers from multiple clusters.

  Object.keys(serverInfo).forEach(key => {
    const server = serverInfo[key];

    if (
      server.swarm &&
      server.swarm.LocalNodeState !== 'inactive' &&
      server.swarm.Cluster
    ) {
      hosts.push(key);
    }
  });

  return hosts;
}

export function desiredManagers(config, serverInfo) {
  const { managers } = getOptions(config);
  const servers = Object.keys(config.servers);
  let additionalManagers = 0;

  log('requested managers', managers);

  // Try to get an odd number of managers
  if (managers.length % 2 === 0 && managers.length < servers.length) {
    additionalManagers = 1;
  }

  // When there are enough servers, make sure there are
  // at least 3 managers, since it can then handle one manager
  // going down
  if (servers.length >= 3 && managers.length < 3) {
    additionalManagers = 3 - managers.length;
  }

  log('additional managers', additionalManagers);

  if (additionalManagers > 0) {
    const current = currentManagers(config, serverInfo);
    const diff = _.difference(current, managers);
    const managersToAdd = diff.splice(0, additionalManagers);

    log('managers to add', managersToAdd);
    additionalManagers -= managersToAdd.length;
    managers.push(...managersToAdd);
  }

  if (additionalManagers > 0) {
    const diff = _.difference(Object.keys(config.servers), managers);
    const managersToAdd = diff.splice(0, additionalManagers);
    log('random servers to add', managersToAdd);
    managers.push(...managersToAdd);
  }

  log('desired managers', managers);

  return managers;
}

export function findNodes(config, serverInfo) {
  const nodes = [];
  const managers = currentManagers(config, serverInfo);

  if (managers.length === 0) {
    return nodes;
  }

  // TODO: handle nodes that aren't listed in the config.server
  // TODO: handle multiple clusters

  const manager = managers[0];
  const ids = Object.keys(serverInfo).reduce((result, serverName) => {
    if (serverInfo[serverName].swarm) {
      const id = serverInfo[serverName].swarm.NodeID;

      result[id] = serverName;
    }

    return result;
  }, {});

  return serverInfo[manager].swarmNodes.map(node => ids[node.ID]);
}

export function nodeIdsToServer(config, serverInfo) {
  const allIds = [];
  const result = {};

  Object.keys(serverInfo).forEach(host => {
    if (serverInfo[host].swarm) {
      result[serverInfo[host].swarm.NodeID] = host;
    }
    if (serverInfo[host].swarmNodes) {
      const nodes = serverInfo[host].swarmNodes;

      allIds.push(...nodes.map(node => node.ID));
    }
  });

  allIds.forEach(id => {
    if (!(id in result)) {
      // This node isn't listed in config.servers
      result[id] = null;
    }
  });

  return result;
}

export function currentLabels(config, info) {
  const result = {};
  const idToHost = nodeIdsToServer(config, info);

  Object.keys(info).forEach(host => {
    if (info[host].swarmNodes instanceof Array) {
      info[host].swarmNodes.forEach(node => {
        const nodeHost = idToHost[node.ID];

        // Check if it is a server mup has access to
        if (nodeHost === null) {
          return;
        }

        result[nodeHost] = node.Spec.Labels;
      });
    }
  });

  return result;
}