import express from 'express'
import { program } from 'commander'

program
    .argument('<ewrUrl>', 'ewr-proxy sparql endpoint url')
    .argument('<upiUrl>', 'upi-proxy sparql endpoint url')
    .option('-p, --port <number>', 'port number', 8080)
    .parse(process.argv);

const [ ewrUrl, upiUrl ] = program.args;
const port = program.opts().port; 

const app = express();

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`webgui listening on port: ${port}`);
});
