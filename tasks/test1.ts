import * as crypto from "crypto";
import * as fs from "fs";
import * as p from "path";

console.log("oi");

let algorithm = "aes-256-cbc";

//
let key = Buffer.from("0000000000000000my-very-nice-key", "latin1"); // key must be 32 bytes for aes256
//

//let key = crypto.randomBytes(32);
//console.log("key", key.toJSON());
//let iv = crypto.randomBytes(16);
let iv = "1234567890123456"; // 16 bytes
//const key2 = crypto.generateKeySync("aes", { length: 32 });
console.log("key", key);

let pathToFile = p.resolve("./tasks/proposal.md");
const data = fs.readFileSync(pathToFile);
let dataAsString = data.toString("utf8");

let cipher = crypto.createCipheriv(algorithm, key, iv);
//let encrypted = cipher.update("text to be encrypted", "utf8", "hex");
let encrypted = cipher.update(dataAsString, "utf8", "hex");
encrypted += cipher.final("hex");
console.log(encrypted);

let decipher = crypto.createDecipheriv(algorithm, key, iv);
let decrypted = decipher.update(encrypted, "hex", "utf8");
decrypted += decipher.final("utf8");
console.log(decrypted);
