# ld-prototype-proxy

## Authorization Proxy

The following describes the structure and usage of the authorization proxy.

### Architecture

![diagram](./doc/img/architecture.svg)

### Installation

Install the necessary dependencies using Node Package Manager.

```shell
cd ld-prototype-proxy/proxy
npm install
```

### Usage

Start the proxy using Node, by providing a configuration and a port
(default is 3000).

```shell
cd ld-prototype-proxy/proxy
node ./main.js ../config/upi --port 3001
```

Alternatively a preconfigured proxy for the EWR and UPI endpoints can be started
via Node Package Manager.

```shell
cd ld-prototype-proxy/proxy
npm run proxy-ewr
npm run proxy-upi
```

* The provided configuration expects the EWR and UPI endpoints to be running
  under `http://localhost:8000/` and `http://localhost:8001/` respectively.

* The proxy endpoints are published under `http://localhost:3000/sparql` and
  `http://localhost:3001/sparql`.

* Additionally the proxy provides a web interface under `http://localhost:3000/`
  to issue SPARQL requests to itself.

#### Authentication & Authorization

The current version of the proxy does not yet feature any authentication methods.

For demonstration purposes a user's role can be provided directly in the following two ways.

1. By specifying a default role on start-up with the `--role` option.  
   e.g. `node ../config/upi --port 3001 --role admin`
2. By specifying the `role` header of the request.

### Logging

The logging output is disabled by default. To enable it, set the following
environment variable before starting the proxy.

**Powershell:**

```PS
$env:DEBUG='proxy:*'
```

### Example

The following example shows the necessary steps to setup the proxy for the EWR
and UPI endpoints.

1. Start the EWR and UPI triple store servers from
   [ld-prototype-data](https://github.com/swiss/ld-prototype-data/tree/main).
  
   ```shell
   cd ld-prototype-data/UC-Serafe/client-POC
   ./startEWR.sh
   ./startUPI.sh
   ```

2. Start the proxy as described above.

   ```shell
   cd ld-prototype-proxy/proxy
   npm run proxy-ewr
   npm run proxy-upi
   ```

3. To test the proxy run the client script from
   [ld-prototype-data](https://github.com/swiss/ld-prototype-data/tree/main)
   with the following arguments.

   ```shell
   cd ld-prototype-data/UC-Serafe/client-POC
   python3 serafe_sparql_query.py --queryNumber 5 --ewr_endpoint http://localhost:3000/sparql/ --upi_endpoint http://localhost:3001/sparql/
   ```

> [!NOTE]
> The proxy is unable to execute federated queries.

## Third-Party Libraries

This project uses the following third-party libraries:

### YASGUI (Yet Another SPARQL GUI)

* **Repository**: [YASGUI on GitHub](https://github.com/Yasgui/Yasgui)
* **License**: MIT License
