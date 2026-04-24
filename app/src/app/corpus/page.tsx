// Redirect permanente: /corpus → /normativa
import { redirect } from "next/navigation";

export default function CorpusRedirect() {
  redirect("/normativa");
}
