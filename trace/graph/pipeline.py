from langgraph.graph import END, StateGraph

from .nodes import TraceState, analysis_node, vision_parser_node

workflow = StateGraph(TraceState)
workflow.add_node("vision_parser", vision_parser_node)
workflow.add_node("analysis",      analysis_node)

workflow.set_entry_point("vision_parser")
workflow.add_edge("vision_parser", "analysis")
workflow.add_edge("analysis",      END)

trace_brain = workflow.compile()
