export interface IUser {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    gender: number;
    image: string;
}

export interface IKunnec extends IUser {
    user_id: number,
}

export interface IPc extends IUser {
    clientId: string;
}

export interface ISetting {
    video: string;
    audioInput: string;
}

export interface IToggle {
    audio: boolean;
    video: boolean;
}

export interface IActive {
    contact: boolean,
    setting: boolean,
    audio: boolean,
    video: boolean,
    chat: boolean
}

export interface IMessage {
    time: Date,
    isFile: boolean,
    content: string,
    user_id: string,
    uploadedName?: string,
}
