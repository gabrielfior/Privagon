# Privagon

**Private DAOs**

Links:

- [Slides](https://docs.google.com/presentation/d/15y_6fAVkUoTbhez8tthjAH7KIDtEXNBRIjZpO3mHflU/edit#slide=id.gc6f80d1ff_0_0)
- [Description of proposal](https://hackmd.io/0hK5aKi4TJ6ETWzIfsmcUw?view)
- Videos:
  - [Smart contracts](https://www.loom.com/share/8648427cae17405b863124527ffb5f27?sid=76a682d6-d0a8-4885-8d50-8b0774f09417)    
  - [Hardhat tests](https://www.loom.com/share/d61f0587209043afb8401df371abcb38?sid=86a0af4a-05e9-4abf-afb9-62a506841f8a) 

Submission for the Zama & Fhenix hackathon.

### Build

`pnpm install `

`pnpm compile`

### Run hardhat tests

Currently we have 2 tests implemented

- 1

```
# Contract owner mints tokens and transfers some to Alice privately
"Mint tokens to owner, transfer tokens to Alice"
```

- 2

```
# Generates new secret locally, uploads encrypted version to the blockchain using FHE, then retrieves the encrypted version and decrypts it locally, asserting that the same key was obtained.
it("Upload secret", async () => {
```

Run tests by executing

```
pnpm hardhat test
```
