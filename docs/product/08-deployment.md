# Deployment

Implementation is a reviewed topology, not an installer promise hidden inside a marketing page.

## Topology and requirements

The delivery maps selected services, local ports, storage ownership, system requirements, startup order, and health checks for one agreed workstation. The public site is independently deployed as a static GitHub Pages artifact.

- The public repository builds the site and its reviewed docs.
- Runtime installation depends on owner-approved components and existing workstation state.
- Updates and rollback use versioned source, backups, and documented checks.

## Status

Static site deployment is stable. A universal runtime installer is planned and is not available from this repository.
