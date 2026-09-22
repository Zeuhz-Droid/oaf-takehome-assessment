import { useState, type FormEvent } from "react";
import {
  addFarmer,
  findLocalFarmerByPhone,
  generateFarmerId,
} from "../lib/offlineDb";
import { checkPhoneOnServer } from "../lib/api";

const PROGRAMMES = ["Maize", "Poultry", "Soybean", "Rice", "Cassava"];

interface FormState {
  name: string;
  phone: string;
  state: string;
  village: string;
  programme: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  state: "",
  village: "",
  programme: PROGRAMMES[0],
};

interface Props {
  isOnline: boolean;
  onSaved: () => void; // tells the parent to refresh the farmer list
}

export function RegistrationForm({ isOnline, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Farmer name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!/^[0-9+ ]{7,15}$/.test(form.phone.trim()))
      return "Phone number looks invalid.";
    if (!form.state.trim()) return "State is required.";
    if (!form.village.trim()) return "Village is required.";
    if (!form.programme.trim()) return "Programme is required.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setChecking(true);
    try {
      const localMatch = await findLocalFarmerByPhone(form.phone.trim());
      const serverMatch =
        isOnline && (await checkPhoneOnServer(form.phone.trim()));

      if (localMatch || serverMatch) {
        setError(
          `A farmer with phone ${form.phone} is already registered. Saving anyway is blocked to avoid duplicates — please confirm before re-entering.`,
        );
        return;
      }

      const saved = await addFarmer({
        id: generateFarmerId(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        state: form.state.trim(),
        village: form.village.trim(),
        programme: form.programme,
      });

      setNotice(
        `Saved ${saved.name} locally (status: pending). ${
          isOnline
            ? "Sync now to push it to the server."
            : "It'll sync once you're back online."
        }`,
      );
      setForm(EMPTY_FORM);
      onSaved();
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="registration-form">
      <h2>Register a farmer</h2>

      <label>
        Full name
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Amina Yusuf"
        />
      </label>

      <label>
        Phone number
        <input
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="e.g. 08012345678"
        />
      </label>

      <label>
        State
        <input
          value={form.state}
          onChange={(e) => update("state", e.target.value)}
          placeholder="e.g. Kaduna"
        />
      </label>

      <label>
        Village
        <input
          value={form.village}
          onChange={(e) => update("village", e.target.value)}
          placeholder="e.g. Rigasa"
        />
      </label>

      <label>
        Programme
        <select
          value={form.programme}
          onChange={(e) => update("programme", e.target.value)}
        >
          {PROGRAMMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      <button type="submit" disabled={checking}>
        {checking ? "Checking…" : "Save farmer"}
      </button>
    </form>
  );
}
