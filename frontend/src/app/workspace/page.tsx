import EditorLoader from "../editor/[id]/editor-loader";

export default function WorkspacePage() {
    return (
        <div style={{ height: "100vh" }}>
            <EditorLoader documentId="workspace" />
        </div>
    );
}
