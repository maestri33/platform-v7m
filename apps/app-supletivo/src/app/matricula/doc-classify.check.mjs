// self-check da regra classifyVerdict (lógica pura, sem React). Roda com node via tsx-like: como é
// TS, reimplemento a função aqui espelhando doc-classify.tsx e valido os casos de negócio.
function classifyVerdict(c, audience) {
  if (c.is_document === null) return { kind: "confirm" };
  if (c.is_document === false) return { kind: "not_document" };
  if (!c.doc_type) return { kind: "confirm" };
  if (c.doc_type === "cnh" && audience === "student") return { kind: "reject_cnh" };
  return { kind: "accept", docType: c.doc_type, completeness: c.completeness };
}
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FALHOU:", msg, "\n  got:", JSON.stringify(a), "\n  want:", JSON.stringify(b)); process.exit(1); } };
// RG frente + aluno → accept
eq(classifyVerdict({is_document:true,doc_type:"rg",completeness:"front",confidence:.9},"student"), {kind:"accept",docType:"rg",completeness:"front"}, "RG frente aluno");
// CNH + aluno → rejeita
eq(classifyVerdict({is_document:true,doc_type:"cnh",completeness:"full",confidence:.8},"student"), {kind:"reject_cnh"}, "CNH aluno rejeita");
// CNH + promotor → aceita
eq(classifyVerdict({is_document:true,doc_type:"cnh",completeness:"full",confidence:.8},"promoter"), {kind:"accept",docType:"cnh",completeness:"full"}, "CNH promotor aceita");
// não é doc → not_document
eq(classifyVerdict({is_document:false,doc_type:null,completeness:null,confidence:.9},"student"), {kind:"not_document"}, "não é doc");
// IA indefinida → confirm
eq(classifyVerdict({is_document:null,doc_type:null,completeness:null,confidence:null},"student"), {kind:"confirm"}, "IA indefinida confirm");
// is_document true mas sem tipo → confirm
eq(classifyVerdict({is_document:true,doc_type:null,completeness:"front",confidence:.5},"student"), {kind:"confirm"}, "sem tipo confirm");
console.log("OK — 6 casos de classifyVerdict passaram");
