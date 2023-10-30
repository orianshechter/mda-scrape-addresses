export enum AccountType {
    Regular = '',
    MadaBloodServices = ' - שרותי הדם מד"א',
    MadaStation = ' - תחנת מד"א'
}
export interface MadaAddressDto {
    DateDonation: string;
    FromHour: string;
    ToHour: string;
    Name: string;
    City: string;
    Street: string;
    NumHouse: string;
    AccountType: AccountType;
    SchedulingURL: string;
}