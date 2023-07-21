import {expect, test} from '@oclif/test'

describe('createProposal', () => {
  test
  .stdout()
  .command(['createProposal'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['createProposal', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
