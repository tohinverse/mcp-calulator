import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const server = new McpServer({
    name: "my-first-mcp",
    version: "1.0.0",
});
// Tool: echo back a message
server.tool("echo", "Echoes back whatever message you send", { message: z.string().describe("The message to echo back") }, async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }],
}));
// Tool: simple calculator
server.tool("calculate", "Performs basic arithmetic operations", {
    operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("The arithmetic operation to perform"),
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
}, async ({ operation, a, b }) => {
    let result;
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
});
// Tool: get GitHub repositories for a username
server.tool("get_github_repos", "Fetches public repositories for a given GitHub username", {
    username: z.string().describe("GitHub username"),
    sort: z
        .enum(["created", "updated", "pushed", "full_name"])
        .optional()
        .default("updated")
        .describe("Sort repositories by this field"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe("Number of repositories to return (max 100)"),
}, async ({ username, sort, limit }) => {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=${sort}&per_page=${limit}`;
    const res = await fetch(url, {
        headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "my-first-mcp",
        },
    });
    if (res.status === 404) {
        return {
            content: [{ type: "text", text: `GitHub user "${username}" not found.` }],
            isError: true,
        };
    }
    if (!res.ok) {
        return {
            content: [{ type: "text", text: `GitHub API error: ${res.status} ${res.statusText}` }],
            isError: true,
        };
    }
    const repos = (await res.json());
    if (repos.length === 0) {
        return {
            content: [{ type: "text", text: `No public repositories found for "${username}".` }],
        };
    }
    const lines = repos.map((repo, i) => {
        const parts = [
            `${i + 1}. **${repo.name}**`,
            `   URL: ${repo.html_url}`,
            `   Stars: ${repo.stargazers_count}  Forks: ${repo.forks_count}`,
            repo.language ? `   Language: ${repo.language}` : null,
            repo.description ? `   ${repo.description}` : null,
            repo.topics?.length ? `   Topics: ${repo.topics.join(", ")}` : null,
            `   Updated: ${new Date(repo.updated_at).toDateString()}`,
        ];
        return parts.filter(Boolean).join("\n");
    });
    const text = `Public repositories for **${username}** (${repos.length} shown):\n\n${lines.join("\n\n")}`;
    return { content: [{ type: "text", text }] };
});
// Resource: server info
server.resource("server-info", "info://server", { mimeType: "text/plain" }, async () => ({
    contents: [
        {
            uri: "info://server",
            text: `MCP Server: my-first-mcp\nVersion: 1.0.0\nStarted: ${new Date().toISOString()}`,
        },
    ],
}));
// Prompt: greeting template
server.prompt("greet", "Generate a greeting for a person", { name: z.string().describe("The person's name") }, ({ name }) => ({
    messages: [
        {
            role: "user",
            content: {
                type: "text",
                text: `Please greet ${name} in a friendly and professional manner.`,
            },
        },
    ],
}));
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
