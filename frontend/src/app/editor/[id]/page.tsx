import EditorLoader from "./editor-loader";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;

  return (
    <div style={{ height: "100vh" }}>
      <EditorLoader documentId={id} />
    </div>
  );
}
