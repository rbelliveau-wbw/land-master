# Custom API environment routing

Every hosted widget loads `runtime-context.js` before its application code. SDK v1 widgets initialize with `ZOHO.CREATOR.init()`; migrated SDK2 widgets await `UTIL.getInitParams()` through `LMRuntime.capture()`. The helper records the effective Creator environment and login user. The three current SDK2 runtimes give explicit native environment metadata authority, including the empty Production fragment; URL hints apply only when native metadata is absent. Each widget records its runtime identity in its audit/diagnostic log, including:

- `environment`: `DEVELOPMENT`, `STAGE`, `PRODUCTION`, or `UNKNOWN`
- `user`: the effective logged-in or impersonated Creator user
- `environmentFragment`: the Creator environment fragment when supplied

Custom API calls use the production link name as the canonical source name and resolve at invocation time:

| Creator environment | API link-name rule |
| --- | --- |
| Development | `<production-link-name>_DEV` |
| Production | Existing production link name |
| Stage | `<production-link-name>_STAGE` (fail closed until Stage APIs are explicitly created) |

Two older Development APIs predate the suffix convention and remain explicit exceptions:

- Production `Save_PF1` resolves to Development `Save_PF`.
- Production `Get_Proforma_Approval_PDF1` resolves to Development `Get_Proforma_Approval_PDF`.

The documented environment API pairs use OAuth2 and All Users scope; verify each current binding rather than inferring enabled status from a source name. They generally preserve the Production HTTP method and request shape. Both access API Development bindings (`Get_User_Access_DEV` and the additive `Get_User_Access_Lean_DEV`) intentionally use JSON `POST`, while their Production counterparts use GET.

`Get_User_Access_DEV` receives the impersonated Creator username in the `user` property after the widget removes an email suffix such as `@zohocreator.com`. This prevents the widget SDK from dropping the identity as a GET query parameter and allowing the function to fall back to the publishing administrator. Do not add a production fallback to a Development or Stage candidate list; a missing environment endpoint must fail instead of writing across environments.

`Get_User_Access_DEV` calls the small `getUserAccessDev` wrapper. It maps only `rbelliveau` or `rbelliveau@wbdevelopment.com` to the existing `wbdevelopment` User Access row, then calls the shared `getUserAccess` permission function. Production `Get_User_Access` calls `getUserAccess` directly, so the DEV alias cannot run through that API. Keep permission rules in `getUserAccess` and this single DEV alias in the wrapper. Verified in Development on 2026-09-24: the Pro Forma Manager no longer showed read-only access after the wrapper replaced the copied function.

Stage copies were not created as part of the Development isolation change. Create and verify `_STAGE` APIs before testing workflows in Stage.

On 2026-10-02 the additive lean pair was registered with the same full-access API scope and Standard response. `Get_User_Access_Lean_DEV` binds Development `Default.getUserAccessLeanDev`; `Get_User_Access_Lean` binds Production `Default.getUserAccessLean`, published with Creator backend 9.33. Development shared-key and denied-response parity passed. Production API enabled details are verified, while signed-in GET parity remains pending. Function-editor Execute returns Development data and cannot prove the Production API path. See [lean access contract](creator-lean-access-contract.md) before caller adoption. Production/Stage access GET omits all argument containers so the backend uses authoritative `zoho.loginuser`; native email and its local part do not reliably identify that username. The confirmed Development access POST retains a normalized object `payload` and its existing alias. Other SDK2 GET APIs with arguments still use encoded string `query_params`.
