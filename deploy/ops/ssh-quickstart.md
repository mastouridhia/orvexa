# Orvexa — SSH in Under 5 Minutes

**Goal:** SSH into the VPS from anywhere (laptop, phone, friend's laptop) in under 5 minutes.

---

## From your laptop (normal)

```bash
ssh root@51.210.97.193
```

If your SSH key is set up, this is instant. If it asks for a password, use the root password from Bitwarden.

---

## From a new machine (no SSH key)

```bash
ssh root@51.210.97.193
# Enter root password from Bitwarden when prompted
```

Then once in, copy your public key so future logins are keyless:
```bash
# On the new machine first, generate a key if needed:
ssh-keygen -t ed25519

# Then copy it to the VPS:
ssh-copy-id root@51.210.97.193
```

---

## From your phone

Install **Termius** (iOS or Android) — free tier is enough.

1. Open Termius → New Host
2. Hostname: `51.210.97.193`
3. Username: `root`
4. Password: [from Bitwarden]
5. Save → Connect

Test this **before** go-live so you know it works.

---

## From anywhere with a browser (emergency only)

Log into https://www.ovhcloud.com → VPS section → KVM console.
This gives you a browser-based terminal even if SSH port is blocked.
Credentials: OVH account (email + password from Bitwarden).

---

## Once in — navigate to the project

```bash
cd /opt/orvexa
docker compose ps        # check all containers running
docker compose logs -f api  # watch live logs
```

---

## Quick health check (one-liner)

```bash
curl -s https://api.orvexa.tn/health
```

Expected response: `{"status":"ok"}`

---

## Practice drill (do this now)

- [ ] SSH from laptop → confirmed working
- [ ] SSH from phone (Termius) → confirmed working
- [ ] Locate OVH KVM console URL and bookmark it
- [ ] All three take under 5 minutes each
