import {
  SYMBTR_CATALOG,
  SYMBTR_CATALOG_COUNT,
  SYMBTR_UPSTREAM_REPOSITORY_URL,
  getSymbTrEntryById,
} from "@/data/symbtr/catalog";
import {HICAZKAR_PESREV, HICAZKAR_REFERENCE_SOURCES} from "@/data/pieces/hicazkarPesrev";
import bulkCandidateData from "./external-reference-bulk-candidates.json";
import {
  dedupeExternalReferenceSources,
  getExternalReferenceCoverage,
  validateExternalReferenceManifest,
  type ExternalReferenceCoverage,
  type ExternalReferenceSource,
} from "./external-sources";

export const SYMBTR_V3_ZENODO_RECORD_URL = "https://zenodo.org/records/15470412";
export const SYMBTR_V3_REFERENCE_VERIFIED_AT = "2026-05-10";
export const CURATED_EXTERNAL_REFERENCE_VERIFIED_AT = "2026-05-10";

type BulkExternalReferenceCandidateStatus = "accepted" | "needs-review" | "rejected";

interface BulkExternalReferenceCandidate {
  catalogId: string;
  status: BulkExternalReferenceCandidateStatus;
  checkedAt: string;
  source: ExternalReferenceSource;
}

function getAcceptedBulkExternalReferenceManifest(): Readonly<Record<string, readonly ExternalReferenceSource[]>> {
  const manifest: Record<string, ExternalReferenceSource[]> = {};

  for (const candidate of bulkCandidateData.candidates as BulkExternalReferenceCandidate[]) {
    if (candidate.status !== "accepted") continue;
    manifest[candidate.catalogId] = [...(manifest[candidate.catalogId] ?? []), candidate.source];
  }

  return manifest;
}

function mergeExternalReferenceManifests(
  ...manifests: Readonly<Record<string, readonly ExternalReferenceSource[]>>[]
): Readonly<Record<string, readonly ExternalReferenceSource[]>> {
  const merged: Record<string, ExternalReferenceSource[]> = {};

  for (const manifest of manifests) {
    for (const [catalogId, sources] of Object.entries(manifest)) {
      merged[catalogId] = [...(merged[catalogId] ?? []), ...sources];
    }
  }

  return merged;
}

const MANUAL_PIECE_EXTERNAL_REFERENCE_MANIFEST = {
  [HICAZKAR_PESREV.symbtrCatalogId]: HICAZKAR_REFERENCE_SOURCES,
  "acem--ilahi--duyek--aldanma_dunya--zekai_dede": [
    {
      id: "defteriniz-aldanma-dunya-varina-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://defteriniz.com/aldanma-dunya-varina-t-s-m-sarki-notasi-ve-sozleri/46698/",
      title: "Aldanma Dünya Varına | T.S.M. Şarkı Notası ve Sözleri",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Zekai Dede, Acem makam and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "beyatiaraban--ilahi--duyek--gonul_mazhardir--enderunlu_hafiz_husnu_efendi": [
    {
      id: "defteriniz-gonul-mazhardir-envari-cemale-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://defteriniz.com/gonul-mazhardir-envar-i-cemale-t-s-m-sarki-notasi-ve-sozleri/76409/",
      title: "Gönül Mazhardır Envar-ı Cemale | T.S.M. Şarkı Notası ve Sözleri",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes:
        "Web curation checked title, composer Hafız Hüsnü Efendi, Bayati Araban makam and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "acemasiran--sarki--aksak--acildi_nevbahar--sadullah_aga": [
    {
      id: "divanmakam-acildi-nevbahar-acemasiran-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://divanmakam.com/forum/acildi-nev-bahar-bir-gonca-i-gul-sadullah-aga-haci-acem-asiran.190/",
      title: "Açıldı Nev-bahar Bir Gonca-i Gül - Sadullah Ağa (Hacı) - Acem Aşiran",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Sadullah Ağa, Acem Aşiran makam, Şarkı form and Aksak usul against the SymbTr catalog entry.",
    },
  ],
  "beyati--sarki--duyek--aklimdan_gecenleri--arif_sami_toker": [
    {
      id: "turkuseli-aklimdan-gecenleri-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://turkuseli.com/turk-sanat-musikisi/aklimdan-gecenleri-bir-bilebilsen-sozleri-ve-notalari-11389",
      title: "Aklımdan geçenleri bir bilebilsen Sözleri ve Notaları",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Arif Sami Toker, Bayati makam and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "beyati--sarki--aksak--benzemez_kimse--fehmi_tokay": [
    {
      id: "salihbora-benzemez-kimse-sana-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://www.salihbora.com/benzemez-kimse-sana-tavrina-hayran-olayim/",
      title: "Benzemez Kimse Sana Tavrına Hayran Olayım",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Fehmi Tokay, Beyati makam, Şarkı form and Aksak usul against the SymbTr catalog entry.",
    },
  ],
  "hicaz--ilahi--sofyan--ben_bu--ahmet_hatipoglu": [
    {
      id: "divanmakam-ben-bu-yolu-bilmez-idim-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://divanmakam.com/forum/ben-bu-yolu-bilmez-idim-ask-gonlume-dusdu-gider-ahmet-hatipoglu-tanburi-hicaz.4665/",
      title: "Ben Bu Yolu Bilmez İdim Aşk Gönlüme Düşdü Gider - Ahmet Hatipoğlu - Hicaz",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Ahmet Hatipoğlu, Hicaz makam, İlahi form and Sofyan usul against the SymbTr catalog entry.",
    },
  ],
  "hicaz--ilahi--sofyan--ey_asikan--seyh_mesud_efendi": [
    {
      id: "divanmakam-ey-asikan-ask-mezheb-u-dindir-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://divanmakam.com/forum/ey-asikan-ey-asikan-ask-mezheb-u-dindir-bana-mesud-efendi-seyh-hicaz.13828/",
      title: "Ey Aşıkan Ey Aşıkan Aşk Mezheb Ü Dindir Bana - Mesud Efendi - Şeyh - Hicaz",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Şeyh Mesud Efendi, Hicaz makam, İlahi form and Sofyan usul against the SymbTr catalog entry.",
    },
  ],
  "hicaz--ilahi--duyek--icimde_bir--amir_ates": [
    {
      id: "defteriniz-icimde-bir-dertli-bulbul-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://defteriniz.com/icimde-bir-dertli-bulbul-oter-yunus-yunus-diye-t-s-m-sarki-notasi-ve-sozleri/82851/",
      title: "İçimde Bir Dertli Bülbül Öter Yunus Yunus Diye | T.S.M. Şarkı Notası ve Sözleri",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Amir Ateş, Hicaz makam and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "hicaz_humayun--ilahi--sofyan--daglar_ile--kutbi_dede": [
    {
      id: "engincanli-daglar-ile-taslar-ile-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://engincanli.com/wp-content/uploads/2022/09/Hicaz-Humayun-Ilahi-Daglar-ile-taslar-ile.pdf",
      title: "Hicaz-Hümayun İlahi - Dağlar ile taşlar ile",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Kutbî Dede, Hicaz-Hümayun makam, İlahi form and Sofyan usul against the SymbTr catalog entry.",
    },
  ],
  "huseyni--ilahi--duyek--ars_taki--rifat_bey": [
    {
      id: "turkuseli-ars-taki-meskenindir-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://turkuseli.com/turk-sanat-musikisi/ars-taki-meskenindir-ya-huseyn-ibn-i-ali-sozleri-ve-notalari-13049",
      title: "Arş takı meskenindir yâ Hüseyn ibn-i Ali Sözleri ve Notaları",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes:
        "Web curation checked title, composer Rifat Bey, Hüseyni makam and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "huseyni_gulizar--ilahi--sofyan--cun_sana--hafiz_post": [
    {
      id: "divanmakam-cun-sana-gonlum-muptela-dustu-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://divanmakam.com/forum/cun-sana-gonlum-muptela-dustu-hafiz-post-mehmed-celebi-imamzade-huseyni.10792/",
      title: "Çün Sana Gönlüm Müptela Düştü - Hafız Post - Hüseyni",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes:
        "Web curation checked title, composer Hafız Post, Hüseyni/Gülizar makam, İlahi form and Sofyan usul against the SymbTr catalog entry.",
    },
  ],
  "huzzam_icedid--ilahi--duyek--goster_bize--huseyin_sadettin_arel": [
    {
      id: "divanmakam-goster-bize-rah-i-huda-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://divanmakam.com/forum/goster-bize-rah-i-huda-canlar-suluk-etsin-sana-huseyin-sadettin-arel-huzzam-i-cedid.17758/",
      title: "Göster Bize Rah-ı Hüda Canlar Sülük Etsin Sana - Hüseyin Sadettin Arel - Hüzzam-ı Cedid",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes:
        "Web curation checked title, composer Hüseyin Sadettin Arel, Hüzzam-ı Cedid makam, İlahi form and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "karcigar--ilahi--duyek--ey_derde_derman--rakim_elkutlu": [
    {
      id: "divanmakam-ey-derde-derman-isteyen-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://divanmakam.com/forum/ey-derde-derman-isteyen-rakim-elkutlu-hoca-mehmet-karcigar.13975/",
      title: "Ey Derde Derman İsteyen - Rakım Elkutlu - Hoca Mehmet - Karcığar",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes:
        "Web curation checked title, composer Rakım Elkutlu, Karcığar makam, İlahi form and Düyek usul against the SymbTr catalog entry.",
    },
  ],
  "isfahan--ilahi--sofyan--yandim_yakildim--dede_efendi": [
    {
      id: "defteriniz-yandim-yakildim-nar-i-aska-score",
      label: "Nota kaynağı",
      provider: "score",
      url: "https://defteriniz.com/yandim-yakildim-ben-nar-i-aska-t-s-m-sarki-notasi-ve-sozleri/112571/",
      title: "Yandım Yakıldım Ben Nar-ı Aşka | T.S.M. Şarkı Notası ve Sözleri",
      access: "external-link",
      verification: "manual",
      verifiedAt: CURATED_EXTERNAL_REFERENCE_VERIFIED_AT,
      notes: "Web curation checked title, composer Dede Efendi, Isfahan makam, İlahi form and Sofyan usul against the SymbTr catalog entry.",
    },
  ],
} as const satisfies Readonly<Record<string, readonly ExternalReferenceSource[]>>;

const CURATED_PIECE_EXTERNAL_REFERENCE_MANIFEST = mergeExternalReferenceManifests(
  MANUAL_PIECE_EXTERNAL_REFERENCE_MANIFEST,
  getAcceptedBulkExternalReferenceManifest(),
);

export const PIECE_EXTERNAL_REFERENCE_MANIFEST: Readonly<Record<string, readonly ExternalReferenceSource[]>> =
  CURATED_PIECE_EXTERNAL_REFERENCE_MANIFEST;

export interface PieceExternalReferenceCoverage {
  totalCatalogEntries: number;
  catalogEntriesWithOfficialReferences: number;
  catalogEntriesWithCuratedReferences: number;
  missingOfficialReferenceCount: number;
  missingCuratedReferenceCount: number;
  officialReferenceCount: number;
  curatedReferenceCount: number;
  resolvedReferenceCount: number;
}

function toReferenceIdPart(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getOfficialSymbTrV3ExternalReferences(catalogId: string): readonly ExternalReferenceSource[] {
  const entry = getSymbTrEntryById(catalogId);
  if (!entry) return [];

  const referenceIdPart = toReferenceIdPart(entry.id);

  return [
    {
      id: `${referenceIdPart}-symbtr-v3-zenodo`,
      label: "SymbTr v3 Zenodo",
      provider: "symbtr",
      url: SYMBTR_V3_ZENODO_RECORD_URL,
      title: `SymbTr v3 dataset entry: ${entry.id}`,
      access: "metadata-only",
      verification: "catalog",
      verifiedAt: SYMBTR_V3_REFERENCE_VERIFIED_AT,
      notes: "Official SymbTr v3 dataset record; local member paths are resolved from the canonical catalog without automatic download.",
    },
    {
      id: `${referenceIdPart}-mtg-symbtr-github`,
      label: "MTG/SymbTr GitHub",
      provider: "github",
      url: SYMBTR_UPSTREAM_REPOSITORY_URL,
      title: `MTG/SymbTr repository reference: ${entry.id}`,
      access: "metadata-only",
      verification: "catalog",
      verifiedAt: SYMBTR_V3_REFERENCE_VERIFIED_AT,
      notes: "Official upstream repository reference; PDF and v3 archive coverage remains represented by the Zenodo dataset and local archive metadata.",
    },
  ];
}

export function getPieceExternalReferences(catalogId: string): readonly ExternalReferenceSource[] {
  return dedupeExternalReferenceSources([
    ...getOfficialSymbTrV3ExternalReferences(catalogId),
    ...(PIECE_EXTERNAL_REFERENCE_MANIFEST[catalogId] ?? []),
  ]);
}

export function validatePieceExternalReferenceManifest(): string[] {
  const officialReferenceErrors = SYMBTR_CATALOG.flatMap((entry) =>
    validateExternalReferenceManifest({[entry.id]: getOfficialSymbTrV3ExternalReferences(entry.id)}),
  );
  const unknownCuratedCatalogIdErrors = Object.keys(PIECE_EXTERNAL_REFERENCE_MANIFEST)
    .filter((catalogId) => !getSymbTrEntryById(catalogId))
    .map((catalogId) => `${catalogId}: Curated external reference catalog id is not present in the SymbTr catalog`);

  return [
    ...officialReferenceErrors,
    ...unknownCuratedCatalogIdErrors,
    ...validateExternalReferenceManifest(PIECE_EXTERNAL_REFERENCE_MANIFEST),
  ];
}

export function getPieceExternalReferenceCoverage(): ExternalReferenceCoverage {
  return getExternalReferenceCoverage(PIECE_EXTERNAL_REFERENCE_MANIFEST, SYMBTR_CATALOG_COUNT);
}

export function getResolvedPieceExternalReferenceCoverage(): PieceExternalReferenceCoverage {
  const officialEntriesWithReferences = SYMBTR_CATALOG.filter(
    (entry) => getOfficialSymbTrV3ExternalReferences(entry.id).length > 0,
  ).length;
  const curatedCoverage = getPieceExternalReferenceCoverage();
  const officialReferenceCount = SYMBTR_CATALOG.reduce(
    (total, entry) => total + getOfficialSymbTrV3ExternalReferences(entry.id).length,
    0,
  );
  const resolvedReferenceCount = SYMBTR_CATALOG.reduce(
    (total, entry) => total + getPieceExternalReferences(entry.id).length,
    0,
  );

  return {
    totalCatalogEntries: SYMBTR_CATALOG_COUNT,
    catalogEntriesWithOfficialReferences: officialEntriesWithReferences,
    catalogEntriesWithCuratedReferences: curatedCoverage.catalogEntriesWithReferences,
    missingOfficialReferenceCount: Math.max(0, SYMBTR_CATALOG_COUNT - officialEntriesWithReferences),
    missingCuratedReferenceCount: curatedCoverage.missingCatalogEntryCount,
    officialReferenceCount,
    curatedReferenceCount: curatedCoverage.referenceCount,
    resolvedReferenceCount,
  };
}
