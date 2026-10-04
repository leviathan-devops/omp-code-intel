// C2kgProduce — ★ THE L4 C2KG PRODUCER (code-to-knowledge-graph, the real Kotlin/JVM toolkit).
//
// ★ THE FINDING THAT MADE THIS POSSIBLE: the toolkit's parser builds its NODES + the
// DEFINES connections WITHOUT VS Code (regex tokenizer + language specs). Only the
// ADDITIONAL outbound connections (USES / INHERITS_FROM) go through VsCodeConnectionParser,
// and the `commsChannel` is used for PROGRESS MESSAGES. So a NO-OP LocalCommunicationInterface
// lets the core graph be built on a host with no VS Code at all.
//
// usage: java -cp <classpath> C2kgProduce <projectRoot> <outFile>
import java.io.File;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import software.bevel.code_to_knowledge_graph.FactoriesKt;
import software.bevel.code_to_knowledge_graph.vscode.VsCodeParser;
import software.bevel.file_system_domain.web.LocalCommunicationInterface;
import software.bevel.graph_domain.graph.Graphlike;
import software.bevel.graph_domain.graph.Node;
import software.bevel.graph_domain.graph.builder.GraphBuilder;
import software.bevel.graph_domain.graph.builder.NodeBuilder;

public final class C2kgProduce {

    /** ★ THE STUB — THE NO-VSCODE SHIM.
     *
     *  THE PROTOCOL (measured from BatchProcessor.kt:65-69 + VsCodeParser.kt:161):
     *      val resp = commsChannel.send(oldBatch.map { it.first })          // a List<VsCodeCommand>
     *      val result = jacksonObjectMapper().readValue(resp, BatchNodeRequestResponse::class.java)
     *      result.commands.forEachIndexed { i, response -> if (response != null) oldBatch[i].second(response) }
     *  ★ THE CONSUMER HANDLES NULL. So the honest no-LSP answer is a BatchNodeRequestResponse
     *  whose `commands` array holds ONE NULL PER REQUEST — "the LSP had nothing to say",
     *  which is exactly true on a host with no VS Code. The parser then builds its nodes
     *  from the regex tokenizer + the language specs and adds only the DEFINES connections.
     *  ★ A FIRST VERSION RETURNED "" AND THE PARSER'S JACKSON THREW ("No content to map due
     *  to end-of-input") — the protocol is a JSON reply, not an empty string. */
    static final class NoComms implements LocalCommunicationInterface {
        @Override public String send(String message) { return "{\"commands\":[]}"; }
        @Override public <T> String send(T message) {
            int n = 0;
            if (message instanceof java.util.List<?> l) n = l.size();
            else if (message instanceof Object[] a) n = a.length;
            StringBuilder b = new StringBuilder("{\"commands\":[");
            for (int i = 0; i < n; i++) { if (i > 0) b.append(','); b.append("null"); }
            return b.append("]}").toString();
        }
        @Override public void sendWithoutResponse(String message) { /* progress only */ }
        @Override public boolean isConnected() { return false; }
        @Override public void close() { }
    }

    public static void main(String[] args) throws Exception {
        final String root = args.length > 0 ? args[0] : new File(".").getAbsolutePath();
        final String out = args.length > 1 ? args[1]
                : root + "/.c2kg/index.json";

        // ★ the parse set = the project's declared source roots (args[2..]); the whole
        //   root only when none are declared.
        List<String> parseRoots = new ArrayList<>();
        for (int i = 2; i < args.length; i++) parseRoots.add(args[i]);
        if (parseRoots.isEmpty()) parseRoots.add(root);
        VsCodeParser parser = FactoriesKt.createVsCodeParser(root, new NoComms());
        GraphBuilder builder = parser.parseToGraphBuilder(parseRoots);
        Graphlike graph = builder.build(root);

        Map<String, Node> nodes = graph.getNodes();
        List<String> rows = new ArrayList<>();
        java.util.Set<String> kept = new java.util.HashSet<>();
        // ★ THE A-0 LAW APPLIED TO L4: the toolkit's walker respects .gitignore, but
        //   Checkpoints/ is not in this repo's .gitignore — so the graph would describe the
        //   ARCHIVE (measured: the first run carried Checkpoints/ paths). The producer drops
        //   them here, exactly as the store-backed layers filter to the live tree.
        final String[] SKIP = { "Checkpoints/", "graphify-out/", "SHIP_PACKAGES/", "node_modules/" };
        for (Map.Entry<String, Node> e : nodes.entrySet()) {
            Node n = e.getValue();
            String file = n.getFilePath() == null ? "" : n.getFilePath();
            boolean skip = false;
            for (String bad : SKIP) if (file.contains(bad)) { skip = true; break; }
            if (skip) continue;
            String name = n.getSimpleName() == null ? e.getKey() : n.getSimpleName();
            // ★ the real accessors (measured): Node.getNodeType() -> the NodeType enum,
            //   Node.getNameLocation().getStart().getLine() -> the 1-based line.
            int line = 0;
            try { line = n.getNameLocation().getStart().getLine(); } catch (Exception ignore) { }
            String kind = n.getNodeType() == null ? "symbol" : n.getNodeType().name();
            rows.add("    {\"name\":" + q(name) + ",\"file\":" + q(file)
                    + ",\"line\":" + line + ",\"kind\":" + q(kind)
                    + ",\"id\":" + q(e.getKey()) + "}");
            kept.add(e.getKey());
        }
        // ★ the edges: every parser connection whose both ends are kept nodes. A KG with
        //   nodes and no edges is a file list wearing the name.
        List<String> edges = new ArrayList<>();
        for (software.bevel.graph_domain.graph.Connection c : graph.getConnections().getAllConnections()) {
            if (!kept.contains(c.getSourceNodeName()) || !kept.contains(c.getTargetNodeName())) continue;
            edges.add("    {\"source\":" + q(c.getSourceNodeName()) + ",\"target\":" + q(c.getTargetNodeName())
                    + ",\"type\":" + q(c.getConnectionType() == null ? "" : c.getConnectionType().name()) + "}");
        }

        File f = new File(out);
        File parent = f.getParentFile();
        if (parent != null) parent.mkdirs();
        try (PrintWriter w = new PrintWriter(f, "UTF-8")) {
            w.println("{");
            w.println("  \"generator\": \"code-to-knowledge-graph (Bevel) via the no-comms parser\",");
            w.println("  \"projectRoot\": " + q(root) + ",");
            w.println("  \"symbols\": [");
            w.println(String.join(",\n", rows));
            w.println("  ],");
            w.println("  \"edges\": [");
            w.println(String.join(",\n", edges));
            w.println("  ]");
            w.println("}");
        }
        System.out.println("[c2kg] root=" + root + " roots=" + parseRoots + " nodes=" + rows.size()
                + " edges=" + edges.size() + " -> " + out + " (" + f.length() + "B)");
    }

    private static String q(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default:
                    if (ch < 0x20) b.append(String.format("\\u%04x", (int) ch));
                    else b.append(ch);
            }
        }
        return b.append('"').toString();
    }
}
