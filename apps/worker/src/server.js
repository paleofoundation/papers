import http from "node:http";
import { inferLayoutTemplateModel, generateFromStyleFamily, parseStructuredText, parseContentDocx } from "@style-family/engine";

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") return json(res, 404, { error: "Not found" });

  let body = "";
  for await (const chunk of req) body += chunk;

  try {
    const parsed = JSON.parse(body);

    if (req.url === "/infer") {
      const examples = (parsed.styleExamplesBase64 ?? []).map((b64) => Buffer.from(b64, "base64").buffer.slice(Buffer.from(b64, "base64").byteOffset, Buffer.from(b64, "base64").byteOffset + Buffer.from(b64, "base64").byteLength));
      const model = await inferLayoutTemplateModel(examples);
      return json(res, 200, { model });
    }

    if (req.url === "/generate") {
      const examples = (parsed.styleExamplesBase64 ?? []).map((b64) => {
        const buf = Buffer.from(b64, "base64");
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      });

      const model = parsed.model;
      let content;
      if (parsed.contentDocxBase64) {
        const buf = Buffer.from(parsed.contentDocxBase64, "base64");
        content = await parseContentDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      } else {
        content = parseStructuredText(parsed.contentText ?? "");
      }

      const { output, audit } = await generateFromStyleFamily(examples, content, model);
      return json(res, 200, { outputDocxBase64: Buffer.from(output).toString("base64"), audit });
    }

    return json(res, 404, { error: "Unknown endpoint" });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

const port = Number(process.env.PORT || 4010);
server.listen(port, () => {
  console.log(`worker listening on http://localhost:${port}`);
});
