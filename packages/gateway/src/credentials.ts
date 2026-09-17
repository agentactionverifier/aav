export interface CredentialProvider{resolve(reference:string):Promise<string|undefined>}
export class EnvironmentCredentialProvider implements CredentialProvider{
  constructor(private readonly references:Record<string,string>,private readonly environment:Record<string,string|undefined>=process.env){}
  async resolve(reference:string){const variable=this.references[reference];return variable?this.environment[variable]:undefined;}
}
