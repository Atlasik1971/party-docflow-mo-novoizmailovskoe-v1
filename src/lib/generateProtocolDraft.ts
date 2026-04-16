/**
 * Автогенерация текста черновика протокола общего собрания первичного отделения.
 * Используется только на клиенте; не меняет API и сохранение.
 */

export type ProtocolDraftFormData = {
  poNumber: string;
  meetingDate: string;
  meetingPlace: string;
  protocolNumber: string;
  membersOnRegister: string;
  membersPresent: string;
  chairperson: string;
  secretary: string;
  invited: string;
  invitedGuests?: Array<{
    fullName: string;
    role: string;
  }>;
};

export type ProtocolDraftQuestion = {
  title: string;
  notes: string;
  speaker: string;
  essence: string;
  decision: string;
  votesFor: string;
  votesAgainst: string;
  abstained: string;
};

function trimOrEmpty(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function formatMeetingDate(isoDate: string): string {
  const s = trimOrEmpty(isoDate);
  if (!s) {
    return "дата проведения уточняется при оформлении протокола";
  }
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return s;
  }
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function protocolNumberLine(form: ProtocolDraftFormData): string {
  const n = trimOrEmpty(form.protocolNumber);
  if (n) {
    return `ПРОТОКОЛ № ${n}`;
  }
  return "ПРОТОКОЛ (номер присваивается в установленном порядке)";
}

function invitedList(form: ProtocolDraftFormData): string {
  const fromList = (form.invitedGuests ?? [])
    .map((guest) => ({
      fullName: trimOrEmpty(guest.fullName),
      role: trimOrEmpty(guest.role),
    }))
    .filter((guest) => guest.fullName || guest.role)
    .map((guest, index) => {
      if (guest.fullName && guest.role) {
        return `${index + 1}. ${guest.fullName}, ${guest.role}.`;
      }
      if (guest.fullName) {
        return `${index + 1}. ${guest.fullName}.`;
      }
      return `${index + 1}. ${guest.role}.`;
    });

  if (fromList.length > 0) {
    return fromList.join("\n");
  }

  const invitedText = trimOrEmpty(form.invited);
  if (invitedText) {
    return invitedText;
  }

  return "Сведения о приглашённых лицах вносятся при оформлении протокола.";
}

function chairVotingLine(form: ProtocolDraftFormData): string {
  const present = trimOrEmpty(form.membersPresent) || "сведения уточняются";
  return [`за — ${present}`, "против — 0", "воздержались — 0"].join("\n");
}

function secretaryVotingLine(form: ProtocolDraftFormData): string {
  const present = trimOrEmpty(form.membersPresent) || "сведения уточняются";
  return [`за — ${present}`, "против — 0", "воздержались — 0"].join("\n");
}

export function generateProtocolTemplateHeader(form: ProtocolDraftFormData): string {
  const poNumber = trimOrEmpty(form.poNumber) || "номер уточняется";
  const place = trimOrEmpty(form.meetingPlace) || "место проведения уточняется";
  const date = formatMeetingDate(form.meetingDate);
  const membersOnRegister =
    trimOrEmpty(form.membersOnRegister) || "сведения уточняются";
  const membersPresent = trimOrEmpty(form.membersPresent) || "сведения уточняются";
  const chairperson =
    trimOrEmpty(form.chairperson) || "кандидатура определяется решением собрания";
  const secretary =
    trimOrEmpty(form.secretary) || "кандидатура определяется решением собрания";

  return [
    protocolNumberLine(form),
    `Общего собрания первичного отделения Партии «ЕДИНАЯ РОССИЯ» № ${poNumber}`,
    "Местное отделение Партии «ЕДИНАЯ РОССИЯ» района Новоизмайловское.",
    `Место проведения: ${place}. Дата собрания: ${date}.`,
    `На учете в первичном отделении Партии состоит ${membersOnRegister} членов Партии.`,
    `На собрании присутствуют ${membersPresent} членов Партии.`,
    "Кворум имеется. Лист регистрации прилагается.",
    "На собрание приглашены и присутствуют:",
    invitedList(form),
    `ПРЕДСЕДАТЕЛЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН: ${chairperson}.`,
    "ГОЛОСОВАЛИ:",
    chairVotingLine(form),
    `СЕКРЕТАРЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН: ${secretary}.`,
    "ГОЛОСОВАЛИ:",
    secretaryVotingLine(form),
    "СЛУШАЛИ: Информацию Председателя собрания об утверждении повестки Общего собрания.",
    "ПОВЕСТКА:",
  ].join("\n");
}

function agendaItemTitle(question: ProtocolDraftQuestion, index: number): string {
  const t = trimOrEmpty(question.title);
  if (t) {
    return t;
  }
  return `Вопрос ${index + 1} повестки дня (формулировка уточняется при оформлении протокола)`;
}

/** Текст для блока «СЛУШАЛИ» (используется также кнопками на форме). */
export function buildEssenceText(question: ProtocolDraftQuestion): string {
  const speakerText = trimOrEmpty(question.speaker)
    ? `Информацию ${trimOrEmpty(question.speaker)}`
    : "Информацию по вопросу";

  const titleText = trimOrEmpty(question.title)
    ? ` по вопросу «${trimOrEmpty(question.title)}»`
    : "";

  const notesText = trimOrEmpty(question.notes)
    ? ` ${trimOrEmpty(question.notes)}`
    : "";

  return `${speakerText}${titleText}.${notesText}`.trim();
}

/** Текст для блока «РЕШИЛИ» (используется также кнопками на форме). */
export function buildDecisionText(question: ProtocolDraftQuestion): string {
  const titleText = trimOrEmpty(question.title) || "рассматриваемому вопросу";

  const noteSentence = trimOrEmpty(question.notes)
    ? `2. ${trimOrEmpty(question.notes).charAt(0).toUpperCase()}${trimOrEmpty(
        question.notes
      ).slice(1)}.`
    : `2. Организовать дальнейшую работу по вопросу «${titleText}» в установленном порядке.`;

  return [
    `1. Информацию по вопросу «${titleText}» принять к сведению.`,
    noteSentence,
    `3. Контроль за исполнением настоящего решения возложить на Секретаря ПО.`,
  ].join("\n");
}

function blockSlushali(question: ProtocolDraftQuestion): string {
  const existing = trimOrEmpty(question.essence);
  if (existing) {
    return existing;
  }
  return buildEssenceText(question);
}

function blockVystupili(question: ProtocolDraftQuestion): string {
  const sp = trimOrEmpty(question.speaker);
  if (sp) {
    return `С докладом (информацией) выступил(а): ${sp}. Иные выступления при необходимости отражаются в приложении к протоколу либо вносятся по решению председательствующего.`;
  }
  return "По вопросу выступлений не зафиксировано. При необходимости перечень выступивших лиц и содержание выступлений уточняются при окончательном оформлении протокола.";
}

function blockReshili(question: ProtocolDraftQuestion): string {
  const existing = trimOrEmpty(question.decision);
  if (existing) {
    return existing;
  }
  return buildDecisionText(question);
}

function voteLine(label: string, value: string, fallback: string): string {
  const v = trimOrEmpty(value);
  return `${label} — ${v || fallback}`;
}

function votingBlock(
  form: ProtocolDraftFormData,
  question: ProtocolDraftQuestion
): string {
  const mp = trimOrEmpty(form.membersPresent);
  const fallbackFor = mp
    ? mp
    : "сведения уточняются по итогам голосования";

  return [
    "ГОЛОСОВАЛИ:",
    voteLine("за", question.votesFor, fallbackFor),
    voteLine(
      "против",
      question.votesAgainst,
      "сведения уточняются по итогам голосования"
    ),
    voteLine(
      "воздержались",
      question.abstained,
      "сведения уточняются по итогам голосования"
    ),
  ].join("\n");
}

/**
 * Формирует полный текст черновика протокола по реквизитам и вопросам повестки.
 */
export function generateProtocolDraft(
  form: ProtocolDraftFormData,
  questions: ProtocolDraftQuestion[]
): string {
  const header = generateProtocolTemplateHeader(form);

  const agenda =
    questions.map((q, index) => `${index + 1}. ${agendaItemTitle(q, index)}`).join("\n");

  const questionBlocks = questions
    .map((question, index) => {
      const titleLine = agendaItemTitle(question, index);
      return [
        "",
        `ВОПРОС ${index + 1}`,
        titleLine,
        "",
        "СЛУШАЛИ:",
        blockSlushali(question),
        "",
        "ВЫСТУПИЛИ:",
        blockVystupili(question),
        "",
        "РЕШИЛИ:",
        blockReshili(question),
        "",
        votingBlock(form, question),
      ].join("\n");
    })
    .join("\n");

  return [header, "", agenda, questionBlocks].join("\n").trim();
}
