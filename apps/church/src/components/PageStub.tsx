import SectionHeader from './SectionHeader';

/** Stub de página — substituído pelos page agents */
export default function PageStub({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]">
      <div className="container-brand">
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
      </div>
    </section>
  );
}
