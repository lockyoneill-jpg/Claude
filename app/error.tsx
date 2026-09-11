"use client";

/**
 * Error screen.
 *
 * Says what went wrong and how to fix it, and never apologises (section 10).
 * The two failures a founder will actually hit while setting this up are a
 * missing DATABASE_URL and an empty database, so both get named directly.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message ?? "";
  const missingUrl = message.includes("DATABASE_URL");
  const notSeeded = message.includes("No agency found");
  const cannotConnect =
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|password authentication|SASL|getaddrinfo/i.test(
      message,
    );

  return (
    <div className="px-8 py-10">
      <div className="max-w-xl rounded-lg border border-rule bg-surface p-6">
        <h1 className="text-title font-semibold text-ink">
          {missingUrl
            ? "The database isn't connected yet"
            : notSeeded
              ? "The database is empty"
              : cannotConnect
                ? "Couldn't reach the database"
                : "Something went wrong"}
        </h1>

        {missingUrl && (
          <Steps
            intro="Buyer Hub needs your Supabase connection string before it can show anything."
            steps={[
              "Open the file .env.local in the project folder.",
              "Paste your Supabase connection string between the quotes after DATABASE_URL=",
              "Save the file and restart the app with npm run dev",
            ]}
          />
        )}

        {notSeeded && (
          <Steps
            intro="The connection works, but there's no data in it yet."
            steps={[
              "Run npm run db:push to create the tables.",
              "Run npm run db:seed to load the demo buyers and properties.",
              "Refresh this page.",
            ]}
          />
        )}

        {cannotConnect && (
          <Steps
            intro="The connection string in .env.local was rejected."
            steps={[
              "Check you replaced [YOUR-PASSWORD] with your real database password.",
              "Check the project is running at supabase.com/dashboard — free projects pause after a week of inactivity.",
              "Copy the connection string again from the green Connect button and paste it into .env.local.",
            ]}
          />
        )}

        {!missingUrl && !notSeeded && !cannotConnect && (
          <p className="mt-3 text-base text-muted">
            {message || "The page couldn't load."}
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-gum px-4 py-2 text-base font-semibold text-white hover:bg-[#275948]"
        >
          Try again
        </button>

        {error.digest && (
          <p className="mt-4 text-sm text-muted">
            Reference for the developer: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

function Steps({ intro, steps }: { intro: string; steps: string[] }) {
  return (
    <>
      <p className="mt-3 text-base text-muted">{intro}</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-base text-ink">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </>
  );
}
