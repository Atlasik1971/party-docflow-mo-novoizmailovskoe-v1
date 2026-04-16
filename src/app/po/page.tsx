"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildDecisionText,
  buildEssenceText,
  generateProtocolDraft,
} from "@/lib/generateProtocolDraft";
import { exportProtocolToDocx } from "@/lib/exportProtocolDocx";

type Question = {
  id: number;
  title: string;
  notes: string;
  speaker: string;
  essence: string;
  decision: string;
  votesFor: string;
  votesAgainst: string;
  abstained: string;
  votesEditedManually: boolean;
};

type FormData = {
  poNumber: string;
  meetingDate: string;
  meetingPlace: string;
  protocolNumber: string;
  membersOnRegister: string;
  membersPresent: string;
  chairperson: string;
  secretary: string;
  invited: string;
  invitedGuests: InvitedGuest[];
};

type InvitedGuest = {
  id: number;
  fullName: string;
  role: string;
};

const invitedRoleOptions = [
  "Секретарь Местного отделения Партии «ЕДИНАЯ РОССИЯ» муниципального образования Новоизмайловское",
  "Председатель Местной контрольной комиссии Местного отделения Партии «ЕДИНАЯ РОССИЯ» муниципального образования Новоизмайловское",
];

type SavedAgendaItem = {
  id: string;
  orderIndex: number;
  title: string;
  notes?: string | null;
  speaker?: string | null;
  essence?: string | null;
  decision?: string | null;
  votesFor?: string | null;
  votesAgainst?: string | null;
  abstained?: string | null;
};

type SavedProtocol = {
  id: string;
  title: string;
  number: string | null;
  meetingDate: string | null;
  place: string | null;
  body: string | null;
  createdAt?: string;
  organ?: {
    name: string;
    code: string | null;
  };
  agendaItems: SavedAgendaItem[];
};

function toNonNegativeInt(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function syncVotesWithPresent(question: Question, membersPresent: string): Question {
  const present = toNonNegativeInt(membersPresent);
  const against = toNonNegativeInt(question.votesAgainst);
  const abstained = toNonNegativeInt(question.abstained);
  const votesFor = Math.max(present - against - abstained, 0);

  return {
    ...question,
    votesFor: String(votesFor),
    votesAgainst: String(against),
    abstained: String(abstained),
  };
}

function parseInvitedGuestsFromBody(body: string): InvitedGuest[] {
  const startMarker = "На собрание приглашены и присутствуют:";
  const endMarker = "ПРЕДСЕДАТЕЛЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН:";
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) {
    return [emptyInvitedGuest()];
  }

  const rawBlock = body
    .slice(start + startMarker.length, end)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = rawBlock
    .map((line) => line.replace(/^\d+\.\s*/, "").replace(/\.$/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          id: Date.now() + Math.floor(Math.random() * 100000),
          fullName: parts[0],
          role: parts.slice(1).join(", "),
        };
      }
      return {
        id: Date.now() + Math.floor(Math.random() * 100000),
        fullName: parts[0] || "",
        role: "",
      };
    });

  return parsed.length > 0 ? parsed : [emptyInvitedGuest()];
}

function parseField(body: string, regex: RegExp): string {
  const match = body.match(regex);
  return match?.[1]?.trim() ?? "";
}

function parseTemplateDataFromBody(body: string) {
  return {
    membersOnRegister: parseField(
      body,
      /На учете в первичном отделении Партии состоит\s+(.+?)\s+членов Партии\./i
    ),
    membersPresent: parseField(
      body,
      /На собрании присутствуют\s+(.+?)\s+членов Партии\./i
    ),
    chairperson: parseField(
      body,
      /ПРЕДСЕДАТЕЛЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН:\s*(.+?)\./i
    ),
    secretary: parseField(
      body,
      /СЕКРЕТАРЕМ ОБЩЕГО СОБРАНИЯ ИЗБРАН:\s*(.+?)\./i
    ),
    invitedGuests: parseInvitedGuestsFromBody(body),
  };
}

const emptyQuestion = (): Question => ({
  id: Date.now(),
  title: "",
  notes: "",
  speaker: "",
  essence: "",
  decision: "",
  votesFor: "",
  votesAgainst: "0",
  abstained: "0",
  votesEditedManually: false,
});

const emptyInvitedGuest = (): InvitedGuest => ({
  id: Date.now(),
  fullName: "",
  role: "",
});

export default function POPage() {
  const [showForm, setShowForm] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedProtocols, setSavedProtocols] = useState<SavedProtocol[]>([]);
  const [isLoadingProtocols, setIsLoadingProtocols] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<SavedProtocol | null>(
    null
  );
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState<FormData>({
    poNumber: "",
    meetingDate: "",
    meetingPlace: "",
    protocolNumber: "",
    membersOnRegister: "",
    membersPresent: "",
    chairperson: "",
    secretary: "",
    invited: "",
    invitedGuests: [emptyInvitedGuest()],
  });

  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);

  const loadProtocols = async () => {
    try {
      setIsLoadingProtocols(true);
      const response = await fetch("/api/protocols");
      const result = await response.json();

      if (result.ok) {
        setSavedProtocols(result.documents || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingProtocols(false);
    }
  };

  useEffect(() => {
    loadProtocols();
  }, []);

  const resetForm = () => {
    setFormData({
      poNumber: "",
      meetingDate: "",
      meetingPlace: "",
      protocolNumber: "",
      membersOnRegister: "",
      membersPresent: "",
      chairperson: "",
      secretary: "",
      invited: "",
      invitedGuests: [emptyInvitedGuest()],
    });
    setQuestions([emptyQuestion()]);
    setEditingProtocolId(null);
    setSaveMessage("");
  };

  const loadProtocolIntoForm = (protocol: SavedProtocol) => {
    const templateData = parseTemplateDataFromBody(protocol.body || "");

    setFormData({
      poNumber: protocol.organ?.code || "",
      meetingDate: protocol.meetingDate
        ? String(protocol.meetingDate).slice(0, 10)
        : "",
      meetingPlace: protocol.place || "",
      protocolNumber: protocol.number || "",
      membersOnRegister: templateData.membersOnRegister,
      membersPresent: templateData.membersPresent,
      chairperson: templateData.chairperson,
      secretary: templateData.secretary,
      invited: templateData.invitedGuests
        .map((guest) =>
          [guest.fullName, guest.role].filter(Boolean).join(", ")
        )
        .join("\n"),
      invitedGuests: templateData.invitedGuests,
    });

    setQuestions(
      protocol.agendaItems.length > 0
        ? protocol.agendaItems.map((item, index) => ({
            id: Date.now() + index,
            title: item.title || "",
            notes: item.notes || "",
            speaker: item.speaker || "",
            essence: item.essence || "",
            decision: item.decision || "",
            votesFor: item.votesFor || "",
            votesAgainst: item.votesAgainst || "0",
            abstained: item.abstained || "0",
            votesEditedManually: true,
          }))
        : [emptyQuestion()]
    );

    setEditingProtocolId(protocol.id);
    setSelectedProtocol(null);
    setShowForm(true);
    setSaveMessage("");
  };

  const deleteProtocol = async (id: string) => {
    try {
      const response = await fetch("/api/protocols", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (result.ok) {
        if (selectedProtocol?.id === id) {
          setSelectedProtocol(null);
        }

        if (editingProtocolId === id) {
          setEditingProtocolId(null);
          setShowForm(false);
          resetForm();
        }

        await loadProtocols();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateFormData = (
    field: Exclude<keyof FormData, "invitedGuests">,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "membersPresent") {
      setQuestions((prev) =>
        prev.map((question) => syncVotesWithPresent(question, value))
      );
    }
  };

  const addInvitedGuest = () => {
    setFormData((prev) => ({
      ...prev,
      invitedGuests: [...prev.invitedGuests, emptyInvitedGuest()],
    }));
  };

  const removeInvitedGuest = (id: number) => {
    setFormData((prev) => {
      return {
        ...prev,
        invitedGuests: prev.invitedGuests.filter((guest) => guest.id !== id),
      };
    });
  };

  const updateInvitedGuest = (
    id: number,
    field: "fullName" | "role",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      invitedGuests: prev.invitedGuests.map((guest) =>
        guest.id === id ? { ...guest, [field]: value } : guest
      ),
    }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        ...emptyQuestion(),
        votesFor: formData.membersPresent || "",
      },
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((question) => question.id !== id);
    });
  };

  const updateQuestion = (
    id: number,
    field: keyof Omit<Question, "id" | "votesEditedManually">,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, [field]: value } : question
      )
    );
  };

  const updateVotes = (
    id: number,
    field: "votesFor" | "votesAgainst" | "abstained",
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id
          ? syncVotesWithPresent(
              {
                ...question,
                [field]: value,
                votesEditedManually: true,
              },
              formData.membersPresent
            )
          : question
      )
    );
  };

  const generateEssence = (question: Question) => {
    const essence = buildEssenceText(question);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, essence } : item
      )
    );
  };

  const generateDecision = (question: Question) => {
    const decision = buildDecisionText(question);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, decision } : item
      )
    );
  };

  const generateFullBlock = (question: Question) => {
    const essence = buildEssenceText(question);
    const decision = buildDecisionText(question);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, essence, decision } : item
      )
    );
  };

  const normalizedInvitedText = useMemo(() => {
    const lines = formData.invitedGuests
      .map((guest) => ({
        fullName: guest.fullName.trim(),
        role: guest.role.trim(),
      }))
      .filter((guest) => guest.fullName || guest.role)
      .map((guest) => {
        if (guest.fullName && guest.role) {
          return `${guest.fullName}, ${guest.role}`;
        }
        return guest.fullName || guest.role;
      });

    return lines.join("\n");
  }, [formData.invitedGuests]);

  const formDataForDocument = useMemo(
    () => ({
      ...formData,
      invited: normalizedInvitedText || formData.invited,
    }),
    [formData, normalizedInvitedText]
  );

  const protocolDraft = useMemo(
    () => generateProtocolDraft(formDataForDocument, questions),
    [formDataForDocument, questions]
  );

  const membersOnRegisterValue = toNonNegativeInt(formData.membersOnRegister);
  const membersPresentValue = toNonNegativeInt(formData.membersPresent);
  const hasMembersValidationInput =
    formData.membersOnRegister.trim() !== "" && formData.membersPresent.trim() !== "";
  const membersPresentIsNotMoreThanHalf =
    hasMembersValidationInput &&
    membersOnRegisterValue > 0 &&
    membersPresentValue <= membersOnRegisterValue / 2;

  const copyDraft = async () => {
    await navigator.clipboard.writeText(protocolDraft);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const exportWord = async () => {
    try {
      setIsExporting(true);
      await exportProtocolToDocx(formDataForDocument, questions);
    } catch (error) {
      console.error(error);
      setSaveMessage("Ошибка экспорта в Word");
    } finally {
      setIsExporting(false);
    }
  };

  const saveProtocol = async () => {
    try {
      setIsSaving(true);
      setSaveMessage("");

      const response = await fetch("/api/protocols", {
        method: editingProtocolId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingProtocolId,
          ...formDataForDocument,
          protocolDraft,
          questions,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setSaveMessage(
          editingProtocolId
            ? "Изменения сохранены"
            : "Протокол сохранен в базу"
        );

        if (result.document?.id) {
          setEditingProtocolId(result.document.id);
        }

        await loadProtocols();
        setShowForm(false);
        setSelectedProtocol(null);
      } else {
        setSaveMessage("Ошибка сохранения");
      }
    } catch (error) {
      console.error(error);
      setSaveMessage("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 lg:p-8">
      <h1 className="text-3xl font-bold lg:text-4xl">Блок ПО</h1>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <aside className="xl:col-span-1">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Сохранённые протоколы ПО</h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setSelectedProtocol(null);
                    setShowForm(true);
                  }}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Создать
                </button>

                <button
                  type="button"
                  onClick={loadProtocols}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                >
                  {isLoadingProtocols ? "Обновление..." : "Обновить"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {savedProtocols.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Пока нет сохранённых протоколов.
                </p>
              ) : (
                savedProtocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    onClick={() => loadProtocolIntoForm(protocol)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-5">
                        {protocol.title || "Без названия"}
                      </p>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProtocol(protocol.id);
                        }}
                        className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-600"
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>Номер: {protocol.number || "—"}</p>
                      <p>Дата: {protocol.meetingDate || "—"}</p>
                      <p>Место: {protocol.place || "—"}</p>
                      <p>ПО: {protocol.organ?.name || "—"}</p>
                    </div>

                    <div className="mt-2 text-xs text-slate-600">
                      <p className="font-medium text-slate-700">Повестка:</p>
                      <ul className="mt-1 list-decimal space-y-1 pl-4">
                        {protocol.agendaItems.map((item) => (
                          <li key={item.id}>
                            {item.title || "Без названия вопроса"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="xl:col-span-2">
          {showForm ? (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">
                    {editingProtocolId
                      ? "Редактирование протокола общего собрания ПО"
                      : "Создание протокола общего собрания ПО"}
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDraftModal(true)}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                    >
                      Черновик
                    </button>

                    <button
                      type="button"
                      onClick={exportWord}
                      disabled={isExporting}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
                    >
                      {isExporting ? "Экспорт..." : "Экспорт в Word"}
                    </button>

                    <button
                      type="button"
                      onClick={saveProtocol}
                      disabled={isSaving}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {isSaving
                        ? "Сохранение..."
                        : editingProtocolId
                          ? "Сохранить изменения"
                          : "Сохранить в базу"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProtocolId(null);
                      }}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                    >
                      Закрыть форму
                    </button>
                  </div>
                </div>

                {saveMessage && (
                  <p className="mt-3 text-sm text-slate-600">{saveMessage}</p>
                )}

                <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xl font-semibold">Основные реквизиты</h3>

                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Номер ПО
                    </label>
                    <input
                      type="text"
                      value={formData.poNumber}
                      onChange={(e) =>
                        updateFormData("poNumber", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: № 1234"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Дата собрания
                    </label>
                    <input
                      type="date"
                      value={formData.meetingDate}
                      onChange={(e) =>
                        updateFormData("meetingDate", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Место проведения
                    </label>
                    <input
                      type="text"
                      value={formData.meetingPlace}
                      onChange={(e) =>
                        updateFormData("meetingPlace", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: Санкт-Петербург"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Номер протокола
                    </label>
                    <input
                      type="text"
                      value={formData.protocolNumber}
                      onChange={(e) =>
                        updateFormData("protocolNumber", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: 1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Количество членов на учёте
                    </label>
                    <input
                      type="number"
                      value={formData.membersOnRegister}
                      onChange={(e) =>
                        updateFormData("membersOnRegister", e.target.value)
                      }
                      className={`w-full rounded-xl border px-4 py-3 ${
                        membersPresentIsNotMoreThanHalf
                          ? "border-red-500 bg-red-50"
                          : ""
                      }`}
                      placeholder="Например: 18"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Количество присутствующих
                    </label>
                    <input
                      type="number"
                      value={formData.membersPresent}
                      onChange={(e) =>
                        updateFormData("membersPresent", e.target.value)
                      }
                      className={`w-full rounded-xl border px-4 py-3 ${
                        membersPresentIsNotMoreThanHalf
                          ? "border-red-500 bg-red-50"
                          : ""
                      }`}
                      placeholder="Например: 12"
                    />
                    {membersPresentIsNotMoreThanHalf && (
                      <p className="mt-2 text-sm text-red-600">
                        Для кворума присутствующих должно быть больше половины от числа членов на учёте.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Председатель собрания
                    </label>
                    <input
                      type="text"
                      value={formData.chairperson}
                      onChange={(e) =>
                        updateFormData("chairperson", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: Иванов И.И."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Секретарь собрания
                    </label>
                    <input
                      type="text"
                      value={formData.secretary}
                      onChange={(e) =>
                        updateFormData("secretary", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: Петрова А.А."
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium">
                        Приглашённые
                      </label>
                      <button
                        type="button"
                        onClick={addInvitedGuest}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium"
                      >
                        Добавить приглашённого
                      </button>
                    </div>
                    <div className="space-y-3">
                      {formData.invitedGuests.map((guest) => (
                        <div
                          key={guest.id}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                            <input
                              type="text"
                              value={guest.fullName}
                              onChange={(e) =>
                                updateInvitedGuest(
                                  guest.id,
                                  "fullName",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-3 py-2"
                              placeholder="ФИО"
                            />
                            <div className="grid gap-2">
                              <select
                                value={
                                  invitedRoleOptions.includes(guest.role)
                                    ? guest.role
                                    : ""
                                }
                                onChange={(e) =>
                                  updateInvitedGuest(
                                    guest.id,
                                    "role",
                                    e.target.value
                                  )
                                }
                                disabled={!guest.fullName.trim()}
                                className="w-full rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                <option value="">Выберите должность</option>
                                {invitedRoleOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={guest.role}
                                onChange={(e) =>
                                  updateInvitedGuest(
                                    guest.id,
                                    "role",
                                    e.target.value
                                  )
                                }
                                disabled={!guest.fullName.trim()}
                                className="w-full rounded-xl border px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                placeholder="Или введите должность вручную"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeInvitedGuest(guest.id)}
                              className="rounded-xl border border-red-300 px-3 py-2 text-xs font-medium text-red-600"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold">Вопросы повестки</h3>

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                  >
                    Добавить вопрос
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-xl border bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium">Вопрос {index + 1}</p>

                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(question.id)}
                            className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-600"
                          >
                            Удалить вопрос
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Формулировка вопроса
                          </label>
                          <input
                            type="text"
                            value={question.title}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "title",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            placeholder="Например: Об утверждении плана работы ПО"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Тезисы / комментарий пользователя
                          </label>
                          <textarea
                            value={question.notes}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "notes",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            rows={3}
                            placeholder="Коротко опиши суть вопроса"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Докладчик
                          </label>
                          <input
                            type="text"
                            value={question.speaker}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "speaker",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            placeholder="Например: Секретарь ПО"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Суть вопроса
                          </label>
                          <textarea
                            value={question.essence}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "essence",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            rows={3}
                            placeholder="Здесь позже ИИ будет предлагать текст для блока СЛУШАЛИ"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Проект решения
                          </label>
                          <textarea
                            value={question.decision}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "decision",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            rows={4}
                            placeholder="Здесь позже ИИ будет предлагать текст для блока РЕШИЛИ"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium">
                              За
                            </label>
                            <input
                              type="number"
                              value={question.votesFor}
                              onChange={(e) =>
                                updateVotes(
                                  question.id,
                                  "votesFor",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium">
                              Против
                            </label>
                            <input
                              type="number"
                              value={question.votesAgainst}
                              onChange={(e) =>
                                updateVotes(
                                  question.id,
                                  "votesAgainst",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium">
                              Воздержались
                            </label>
                            <input
                              type="number"
                              value={question.abstained}
                              onChange={(e) =>
                                updateVotes(
                                  question.id,
                                  "abstained",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-4 py-3"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => generateEssence(question)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                          >
                            Предложить суть вопроса
                          </button>

                          <button
                            type="button"
                            onClick={() => generateDecision(question)}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                          >
                            Предложить решение
                          </button>

                          <button
                            type="button"
                            onClick={() => generateFullBlock(question)}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                          >
                            Предложить полный блок
                          </button>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Черновик протокольного блока
                          </p>

                          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-800">
                            <div>
                              <p className="font-semibold">СЛУШАЛИ:</p>
                              <p className="mt-1 whitespace-pre-line">
                                {question.essence ||
                                  "Текст пока не сформирован."}
                              </p>
                            </div>

                            <div>
                              <p className="font-semibold">РЕШИЛИ:</p>
                              <p className="mt-1 whitespace-pre-line">
                                {question.decision ||
                                  "Проект решения пока не сформирован."}
                              </p>
                            </div>

                            <div>
                              <p className="font-semibold">ГОЛОСОВАЛИ:</p>
                              <p className="mt-1 whitespace-pre-line">
                                {`за — ${question.votesFor || "___"}`}
                                {"\n"}
                                {`против — ${question.votesAgainst || "___"}`}
                                {"\n"}
                                {`воздержались — ${question.abstained || "___"}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border bg-white p-6 text-center">
              <div>
                <p className="text-base font-medium text-slate-700">
                  Выберите сохранённый протокол или создайте новый
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setSelectedProtocol(null);
                    setShowForm(true);
                  }}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Создать новый протокол
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <h2 className="text-lg font-semibold">Черновик протокола</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyDraft}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {copied ? "Скопировано" : "Скопировать"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div className="max-h-[calc(90vh-72px)] overflow-auto p-4">
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-800">
                {protocolDraft}
              </pre>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}