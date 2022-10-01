import apiSpec from "../lib/api-spec.js";
import { v4 as uuid } from "uuid";
import Database, { DesignDoc } from "../lib/database.js";
import Role, { ROLES } from './Role.js';

// Create and use a new database instance.
export const database = new Database();
await database.initialize();

const userIndex = new DesignDoc(database, 'user-index:v1', {
    language: 'query',
    views: {
        all: {
            map: {
                fields: { _id: 'asc' },
                partial_filter_selector: { _id: { '$regex': '^user:' } }
            },
            options: {
                def: { fields: ['_id'] }
            }
        }
    }
});

const userViews = new DesignDoc(database, 'user-views:v1', {
    views: {
        byEmail: {
            map: function (doc) {
                if (!doc._id.startsWith('user:')) return;
                emit(doc.email, doc.name);
                for (const email of doc.loginEmails) emit(email, doc.name);
            }
        }
    }
});

export default class User {
    static async findByEmail(email) {
        const result = await database.view(userViews, 'byEmail', { key: email, include_docs: true });
        const document = result?.rows?.[0]?.doc;
        return document ? new User(document) : null;
    }

    static async oauthLogin(profile) {
        // Check if there's an existing account for that email.
        const email = profile?.emails?.[0]?.value;
        if (!email) throw new Error('An email is required for oauth login.');
        const existing = await User.findByEmail(email);
        if (existing) return existing;

        // Otherwise, create a new one, _without_ saving it.
        return new User({
            _id: `user:${uuid()}`,
            name: profile.displayName,
            email,
            profilePhoto: profile.photos?.[0]?.value,
            roles: [ROLES.VISITOR]
        });
    }

    constructor(document) {
        if (!document?._id?.startsWith('user:')) throw new Error('Invalid user id.');
        this._document = document;
        this._loginEmails = new Set(document?.loginEmails);
        this._roles = new Set(document?.roles);
        this._permissions = new Set(document?.permissions);
    }

    get id() {
        return this._document._id.match(`^${'user:'}(?<id>.+)$`)?.groups?.id;
    }

    get name() {
        return this._document.name;
    }

    get email() {
        return this._document.email;
    }

    get emails() {
        return [...this._loginEmails];
    }

    get profilePhoto() {
        return this._document.profilePhoto;
    }

    get roles() {
        return [...this._roles];
    }

    get permissions() {
        return [...this._permissions];
    }

    async save() {
        await database.insert(this._document);
    }

    async destroy() {
        await database.destroy(this._document);
    }

    toString() {
        return `${this.name} (${this.email})`;
    }

    toJSON() {
        return Object
            .entries(apiSpec.components.schemas.User.properties)
            .reduce((acc, [field, options]) => {
                if (options.writeOnly) return acc;
                acc[field] = this[field];
                return acc;
            }, {});
    }

}