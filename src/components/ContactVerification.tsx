import { useState } from 'react';
import { api, jsonPost } from '../lib/api';
import { ErrorBox, Notice, Panel } from './ui';

export function ContactVerification({id,verified,onUpdate}:{id:string;verified:boolean;onUpdate:()=>void}) {
  const [challenge,setChallenge]=useState('');const [destination,setDestination]=useState('');const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function request(){setBusy(true);setError('');try {const r=await api<{challengeId:string;destination:string}>(`/submissions/${encodeURIComponent(id)}/contact-verification`,{method:'POST'});setChallenge(r.challengeId);setDestination(r.destination);setCode('');}catch(e){setError(e instanceof Error?e.message:'Code delivery could not be confirmed.');}finally{setBusy(false);}}
  async function confirm(){setBusy(true);setError('');try{await jsonPost(`/submissions/${encodeURIComponent(id)}/contact-verification/confirm`,{challengeId:challenge,code});setCode('');onUpdate();}catch(e){setError(e instanceof Error?e.message:'Verification failed.');}finally{setBusy(false);}}
  return (
    <Panel title="Verify your new email address">
      <div className="form-body">
        {verified ? (
          <Notice success>Your new email address has been verified.</Notice>
        ) : (
          <>
            <p>
              {challenge
                ? `Enter the 6-digit verification code sent to ${destination}.`
                : "Send a 6-digit verification code to your new email address to complete this request."}
            </p>
            {!challenge ? (
              <div className="form-actions">
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={() => void request()}
                >
                  {busy ? "Sending..." : "Send code"}
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void confirm();
                }}
              >
                <label>
                  Verification code
                  <input
                    aria-label="Verification code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="6-digit code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="button primary"
                    disabled={busy || code.length !== 6}
                  >
                    {busy ? "Verifying..." : "Verify"}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void request()}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        {error && <ErrorBox message={error} />}
      </div>
    </Panel>
  );
}
