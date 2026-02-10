import { EditorLayout } from '@/components/Editor/EditorLayout';

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return <EditorLayout />;
}
