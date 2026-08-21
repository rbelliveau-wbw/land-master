# Custom API environment routing

Every hosted widget loads `runtime-context.js` before its application code. After `ZOHO.CREATOR.init()`, the helper records the effective Creator environment and login user from Creator init parameters, with the iframe/referrer URL as a fallback. Each widget writes a `Runtime identity resolved` entry to its audit/diagnostic log containing:

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

The Zoho Microservices catalog contains Development-bound copies for every production API. The copies use OAuth2, All Users scope, and the same Deluge function and return type as Production. They preserve the Production HTTP method and request shape except for `Get_User_Access_DEV`, which intentionally uses a JSON `POST`.

`Get_User_Access_DEV` receives the impersonated Creator username in the `user` property after the widget removes an email suffix such as `@zohocreator.com`. This prevents the widget SDK from dropping the identity as a GET query parameter and allowing the function to fall back to the publishing administrator. Do not add a production fallback to a Development or Stage candidate list; a missing environment endpoint must fail instead of writing across environments.

Stage copies were not created as part of the Development isolation change. Create and verify `_STAGE` APIs before testing workflows in Stage.
