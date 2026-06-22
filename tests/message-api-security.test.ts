import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { MESSAGE_SENSITIVE_FIELDS, serializeMessageThread } from "../lib/message-safe";
import { encryptSensitiveText } from "../lib/security";

test("message API serializer decrypts approved content without exposing encrypted or user-secret fields", () => {
  process.env.DATA_ENCRYPTION_KEY=randomBytes(32).toString("base64");
  const unsafe={id:"thread-1",clientId:"client-1",subject:"Tax question",status:"OPEN",createdAt:new Date(),updatedAt:new Date(),client:{id:"client-1",name:"Client",email:"client@example.test",profile:{fullName:"Client"},passwordHash:"never"},messages:[{id:"message-1",senderId:"client-1",readAt:null,createdAt:new Date(),bodyEncrypted:encryptSensitiveText("Safe visible message"),sender:{id:"client-1",name:"Client",role:"CLIENT",mfaSecretEncrypted:Buffer.from("never")}}]};
  const response=serializeMessageThread(unsafe as never,"staff-1");const json=JSON.stringify(response);
  assert.equal(response.messages[0].body,"Safe visible message");
  for(const field of MESSAGE_SENSITIVE_FIELDS)assert.equal(json.includes(field),false,`${field} leaked`);
  assert.equal(json.includes("never"),false);
});
