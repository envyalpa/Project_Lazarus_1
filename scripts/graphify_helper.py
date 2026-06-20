"""
graphify_helper.py — Windows-friendly wrapper for graphify operations.
Usage:
  python scripts/graphify_helper.py query "<question>" [--dfs] [--budget N]
  python scripts/graphify_helper.py path "<A>" "<B>"
  python scripts/graphify_helper.py explain "<concept>"
  python scripts/graphify_helper.py update
"""
import sys, json, os, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAPH = ROOT / 'graphify-out' / 'graph.json'
PYTHONUTF8 = '1'


def load_graph():
    if not GRAPH.exists():
        print(f'ERROR: No graph found at {GRAPH}. Run graphify update . first.')
        sys.exit(1)
    from networkx.readwrite import json_graph
    import networkx as nx
    data = json.loads(GRAPH.read_text('utf-8'))
    G = json_graph.node_link_graph(data, edges='links')
    return G, nx


def find_nodes(G, terms, top_n=3):
    terms = [t.lower() for t in terms if len(t) > 3]
    scored = []
    for nid, ndata in G.nodes(data=True):
        label = ndata.get('label', '').lower()
        score = sum(1 for t in terms if t in label)
        if score > 0:
            scored.append((score, nid))
    scored.sort(reverse=True)
    return [nid for _, nid in scored[:top_n]]


def cmd_query(args):
    G, nx = load_graph()
    terms = args.question.split()
    start_nodes = find_nodes(G, terms)
    if not start_nodes:
        print(f'No matching nodes found for query: {args.question}')
        return

    subgraph_nodes = set()
    subgraph_edges = []

    if args.dfs:
        visited = set()
        stack = [(n, 0) for n in reversed(start_nodes)]
        while stack:
            node, depth = stack.pop()
            if node in visited or depth > 6:
                continue
            visited.add(node)
            subgraph_nodes.add(node)
            for neighbor in G.neighbors(node):
                if neighbor not in visited:
                    stack.append((neighbor, depth + 1))
                    subgraph_edges.append((node, neighbor))
    else:
        frontier = set(start_nodes)
        subgraph_nodes = set(start_nodes)
        for _ in range(2):
            next_frontier = set()
            for n in frontier:
                for nb in G.neighbors(n):
                    if nb not in subgraph_nodes:
                        next_frontier.add(nb)
                        subgraph_edges.append((n, nb))
            subgraph_nodes.update(next_frontier)
            frontier = next_frontier

    char_budget = args.budget * 4

    def relevance(nid):
        label = G.nodes[nid].get('label', '').lower()
        return sum(1 for t in terms if t.lower() in label)

    ranked = sorted(subgraph_nodes, key=relevance, reverse=True)

    lines = [
        f'Traversal: {"DFS" if args.dfs else "BFS"} | Start: {[G.nodes[n].get("label", n) for n in start_nodes]} | {len(subgraph_nodes)} nodes'
    ]
    for nid in ranked:
        d = G.nodes[nid]
        lines.append(f'  NODE {d.get("label", nid)} [src={d.get("source_file", "")}]')
    for u, v in subgraph_edges:
        if u in subgraph_nodes and v in subgraph_nodes:
            raw = G[u][v]
            ed = next(iter(raw.values()), {}) if isinstance(G, nx.MultiGraph) else raw
            lines.append(
                f'  EDGE {G.nodes[u].get("label", u)} --{ed.get("relation", "")} [{ed.get("confidence", "")}]--> {G.nodes[v].get("label", v)}'
            )

    output = '\n'.join(lines)
    if len(output) > char_budget:
        output = output[:char_budget] + f'\n... (truncated at ~{args.budget} token budget)'
    print(output)


def cmd_path(args):
    G, nx = load_graph()
    na_nodes = find_nodes(G, args.a.split())
    nb_nodes = find_nodes(G, args.b.split())
    if not na_nodes or not nb_nodes:
        print('Could not find nodes matching the provided terms')
        return
    na, nb = na_nodes[0], nb_nodes[0]
    try:
        path = nx.shortest_path(G, na, nb)
        print(f'Shortest path ({len(path)-1} hops):')
        for i, nid in enumerate(path):
            d = G.nodes[nid]
            print(f'  {i}. {d.get("label", nid)} [{d.get("source_file", "")}]')
            if i < len(path) - 1:
                raw = G[nid][path[i + 1]]
                ed = next(iter(raw.values()), {}) if isinstance(G, nx.MultiGraph) else raw
                print(f'     edge: {ed.get("relation", "")} ({ed.get("confidence", "")}, score={ed.get("confidence_score", "")})')
    except nx.NetworkXNoPath:
        print('No path found between the matched nodes')


def cmd_explain(args):
    G, nx = load_graph()
    nodes = find_nodes(G, args.concept.split(), top_n=1)
    if not nodes:
        print(f'No nodes found for concept: {args.concept}')
        return
    nid = nodes[0]
    nd = G.nodes[nid]
    print(f'=== {nd.get("label", nid)} ===')
    print(f'  Source: {nd.get("source_file", "?")}')
    print(f'  Location: {nd.get("source_location", "?")}')
    print()
    neighbors = list(G.neighbors(nid))
    print(f'Connected to {len(neighbors)} nodes:')
    for nb in sorted(neighbors, key=lambda x: G.nodes[x].get('label', '')):
        raw = G[nid][nb]
        ed = next(iter(raw.values()), {}) if isinstance(G, nx.MultiGraph) else raw
        print(f'  -> {G.nodes[nb].get("label", nb)} ({ed.get("relation", "")})')


def cmd_update(args):
    """Incremental update - re-extract only changed files."""
    print('[graphify] Running incremental update (AST-only, no API cost)...')
    sys.path.insert(0, str(ROOT))
    try:
        import sys as os_sys
        os_sys.argv = ['graphify', 'update', str(ROOT)]
        import graphify.__main__
        graphify.__main__.main()
    except Exception as e:
        print(f'ERROR: graphify update failed: {e}')
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='graphify helper')
    sub = parser.add_subparsers(dest='command')

    q = sub.add_parser('query', help='BFS/DFS traversal query')
    q.add_argument('question', help='Natural language question')
    q.add_argument('--dfs', action='store_true', help='Use DFS instead of BFS')
    q.add_argument('--budget', type=int, default=800, help='Token budget for output')

    p = sub.add_parser('path', help='Shortest path between two concepts')
    p.add_argument('a', help='Starting concept')
    p.add_argument('b', help='Ending concept')

    e = sub.add_parser('explain', help='Focused explanation of a node')
    e.add_argument('concept', help='Concept name')

    u = sub.add_parser('update', help='Incremental graph update')

    args = parser.parse_args()
    if args.command == 'query':
        cmd_query(args)
    elif args.command == 'path':
        cmd_path(args)
    elif args.command == 'explain':
        cmd_explain(args)
    elif args.command == 'update':
        cmd_update(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
