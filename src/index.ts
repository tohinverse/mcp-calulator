import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-first-mcp",
  version: "1.0.0",
});

// Tool: echo back a message
server.tool(
  "echo",
  "Echoes back whatever message you send",
  { message: z.string().describe("The message to echo back") },
  async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }],
  })
);

// Tool: simple calculator
server.tool(
  "calculate",
  "Performs basic arithmetic operations",
  {
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("The arithmetic operation to perform"),
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  },
  async ({ operation, a, b }) => {
    let result: number;
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          return {
            content: [{ type: "text", text: "Error: Division by zero" }],
            isError: true,
          };
        }
        result = a / b;
        break;
    }
    return {
      content: [{ type: "text", text: `${a} ${operation} ${b} = ${result}` }],
    };
  }
);

// Resource: server info
server.resource(
  "server-info",
  "info://server",
  { mimeType: "text/plain" },
  async () => ({
    contents: [
      {
        uri: "info://server",
        text: `MCP Server: my-first-mcp\nVersion: 1.0.0\nStarted: ${new Date().toISOString()}`,
      },
    ],
  })
);

// Prompt: greeting template
server.prompt(
  "greet",
  "Generate a greeting for a person",
  { name: z.string().describe("The person's name") },
  ({ name }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please greet ${name} in a friendly and professional manner.`,
        },
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
