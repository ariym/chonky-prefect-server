import express, { Request, Response } from 'express';

const server = express();

// example route - take a POST body JSON param 'petName' and return it as plaintext
server.post('/example-route', async (req: Request, res: Response) => {
  const { petName } = req.body;

  res.send(petName);

});

export default server;