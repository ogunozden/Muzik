import {ReferencesCurationDetail} from "@/features/references/ReferencesCurationDetail";

export default async function ReferencesCurationDetailPage({
  params,
}: {
  params: Promise<{catalogId: string}>;
}) {
  const {catalogId} = await params;

  return <ReferencesCurationDetail catalogId={decodeURIComponent(catalogId)} />;
}
