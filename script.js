const puppeteer = require('puppeteer');
const Excel = require('exceljs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const r = [];
  r[0] = ["Name", "Occupation", "Employer", "Amount", "Report year", "Election type", "Committee", "Political Party", "State"];
  let c = 1;

  try {
    const workbook = new Excel.Workbook();
    const excelFilePath = 'contributors.xlsx'; // Replace with the actual path to your Excel file
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.getWorksheet(1);
    const contributorNames = [];
    
    worksheet.getColumn(1).eachCell({ includeEmpty: false }, (cell) => {
      let contributorName = cell.value;
      // Replace spaces with plus symbol (+) in the contributor name
      contributorName = contributorName.replace(/\s/g, '+');
      contributorNames.push(contributorName);
    });

    for (const contributor of contributorNames) {
      const baseUrl = `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${contributor}`;
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

      let nextButton;
      while (true) {
        for (let i = 0; i < 30; i++) {
          await page.waitForSelector('.js-panel-button', { visible: true }); // Wait until the button is visible
          const myBtn = (await page.$$('.js-panel-button'))[i];
          if (!myBtn) {
            console.error("Button not found.");
            continue;
          }
          await myBtn.click();
          await page.waitForTimeout(1000);

          const obj = {
            "Name": await page.evaluate(() => document.getElementsByClassName("panel__data")[0].innerText.replace(",", "")),
            "Occupation": await page.evaluate(() => document.getElementsByClassName("panel__data")[2].innerText),
            "Employer": await page.evaluate(() => document.getElementsByClassName("panel__data")[3].innerText),
            "Amount": await page.evaluate(() => document.getElementsByClassName("panel__data")[5].innerText),
            "Report_year": await page.evaluate(() => document.getElementsByClassName("panel__data")[7].innerText),
            "Election_type": await page.evaluate(() => document.getElementsByClassName("panel__data")[10].innerText),
            "Committee": await page.evaluate(() => document.getElementsByClassName("panel__data")[11].innerText),
            "Party": await page.evaluate(() => document.getElementsByClassName("panel__data")[12].innerText),
            "State": await page.evaluate(() => document.getElementsByClassName("panel__data")[14].innerText)
          };
          const item = [obj.Name, obj.Occupation, obj.Employer, obj.Amount, obj.Report_year, obj.Election_type, obj.Committee, obj.Party, obj.State];
          r[c] = item;
          c++;
        }

        // Find the next button
        nextButton = await page.$('#results_next');
        if (!nextButton) {
          console.error("Next button not found.");
          break; // Break the loop if the next button is not found
        }

        if (await nextButton.evaluate(node => node.classList.contains('disabled'))) {
          break; // Break the loop if the next button has the 'disabled' class
        }

        await nextButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Write the data to Excel
    const dataWorksheet = workbook.addWorksheet('Data');
    r.forEach((row) => {
      dataWorksheet.addRow(row);
    });

    const outputFilePath = 'contributors_data.xlsx';
    await workbook.xlsx.writeFile(outputFilePath);
    console.log('Excel file was written successfully');

    await browser.close();
  } catch (err) {
    console.error('Error:', err);
    await browser.close();
  }
})();
