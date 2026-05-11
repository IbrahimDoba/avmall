"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";

export default function ProfilePage() {
  const [name, setName] = React.useState("Tolu Adeniyi");
  const [phone, setPhone] = React.useState("803 421 7790");
  const [email, setEmail] = React.useState("tolu@example.com");

  return (
    <div className="px-4 py-4 pb-6">
      <div className="flex items-center gap-1.5 text-xs text-fg-muted mb-2">
        <Link href="/account" className="hover:text-fg">
          Account
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-fg font-medium">Profile</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-5">Profile</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="flex flex-col gap-4"
      >
        <Field id="name" label="Full name">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id="phone" label="Phone number" hint="Verified · used for OTP login">
          <PhoneInput id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field id="email" label="Email" optional>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" width="full" className="mt-2">
          Save changes
        </Button>
      </form>
    </div>
  );
}
