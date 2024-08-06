const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Mapeamento de tipos de MySQL para Laravel
const mysqlToLaravelTypes = {
    VARCHAR: 'string',
    CHAR: 'char',
    TEXT: 'text',
    MEDIUMTEXT: 'mediumText',
    LONGTEXT: 'longText',
    INT: 'integer',
    BIGINT: 'bigInteger',
    TINYINT: 'tinyInteger',
    SMALLINT: 'smallInteger',
    MEDIUMINT: 'mediumInteger',
    FLOAT: 'float',
    DOUBLE: 'double',
    DECIMAL: 'decimal',
    DATE: 'date',
    DATETIME: 'dateTime',
    TIMESTAMP: 'timestamp',
    TIME: 'time',
    YEAR: 'year',
    BLOB: 'binary',
    JSON: 'json',
    ENUM: 'enum',
    BOOLEAN: 'boolean'
};

// Mapeamento de tipos de Laravel para MySQL
const laravelToMysqlTypes = {
    string: 'VARCHAR',
    char: 'CHAR',
    text: 'TEXT',
    mediumtext: 'MEDIUMTEXT',
    longtext: 'LONGTEXT',
    integer: 'INT',
    biginteger: 'BIGINT',
    tinyinteger: 'TINYINT',
    smallinteger: 'SMALLINT',
    mediumInteger: 'MEDIUMINT',
    float: 'FLOAT',
    double: 'DOUBLE',
    decimal: 'DECIMAL',
    date: 'DATE',
    datetime: 'DATETIME',
    timestamp: 'TIMESTAMP',
    time: 'TIME',
    year: 'YEAR',
    binary: 'BLOB',
    json: 'JSON',
    enum: 'ENUM',
    boolean: 'BOOLEAN'
};

// Função para converter tipo MySQL para Laravel
function convertMysqlToLaravelType(mysqlType, isUnsigned = false) {
    let laravelType = mysqlToLaravelTypes[mysqlType.toUpperCase()] || 'string';
    if (isUnsigned) {
        laravelType = `unsigned${laravelType.charAt(0).toUpperCase() + laravelType.slice(1)}`;
    }
    return laravelType;
}

// Função para converter tipo Laravel para MySQL
function convertLaravelToMysqlType(laravelType) {
    const isUnsigned = laravelType.startsWith('unsigned');
    if (isUnsigned) {
        laravelType = laravelType.replace('unsigned', '').toLowerCase();
    }

    console.log(laravelType);

    const mysqlType = laravelToMysqlTypes[laravelType] || 'VARCHAR';
    return { mysqlType, isUnsigned };
}

function parseTableName(content, action) {
    const tableNameRegex = action === 'create' ? /Schema::create\('(\w+)'/ : /Schema::table\('(\w+)'/;
    const match = tableNameRegex.exec(content);
    return match ? match[1] : null;
}

function parseColumns(content) {
    const columns = {};
    const columnRegex = /\$table->(\w+)\('(\w+)'\)([^;]*);/g;
    let match;

    while ((match = columnRegex.exec(content)) !== null) {
        const [fullMatch, type, name, attributes] = match;

        if (type === 'foreign') {
            continue;
        }

        const { mysqlType, isUnsigned } = convertLaravelToMysqlType(type.toLowerCase());

        columns[name] = {
            name: name,
            type: mysqlType,
            length: '', // Pode precisar de mais lógica para capturar o comprimento se aplicável
            pk: false,
            nn: false,
            uq: false,
            b: false,
            un: isUnsigned,
            zf: false,
            ai: false,
            g: false,
            default: ''
        };

        if (attributes.includes('->primary()')) {
            columns[name].pk = true;
        }

        if (attributes.includes('->nullable()') || attributes.includes('->nullable(true)')) {
            columns[name].nn = false;
        }else{
            columns[name].nn = true;
        }
        if (attributes.includes('->unique()')) {
            columns[name].uq = true;
        }
        if (attributes.includes('->autoIncrement()')) {
            columns[name].ai = true;
        }
    }

    return columns;
}

function parseIndexes(content) {
    const indexes = {};
    const indexRegex = /\$table->(\w+)\(\['(\w+)'\]\)([^;]*);/g;
    let match;

    while ((match = indexRegex.exec(content)) !== null) {
        const [fullMatch, type, columns, attributes] = match;
        const columnsArray = columns.split(',');

        indexes[type + '_' + columns] = {
            name: type + '_' + columns,
            columns: columnsArray.map(name => ({ name: name.trim() }))
        };
    }

    return indexes;
}

function parseForeignKeys(content) {
    const foreignKeys = {};
    const foreignKeyRegex = /\$table->foreign\('(\w+)'\)->references\('(\w+)'\)->on\('(\w+)'\);/g;
    let match;

    while ((match = foreignKeyRegex.exec(content)) !== null) {
        const [fullMatch, column, referencedColumn, referencedTable] = match;

        foreignKeys['fk_' + column] = {
            name: 'fk_' + column,
            referencedTable: referencedTable,
            column: column,
            referencedColumn: referencedColumn
        };
    }

    return foreignKeys;
}

function parseModelingFromComment(content) {
    const modelingRegex = /\/\*\*\n\s*\*\sModeling information:\n\s*\*\sLeft:\s(\w+)\n\s*\*\sTop:\s(\w+)\n\s*\*\sWidth:\s(\w+)\n\s*\*\sHeight:\s(\w+)\n\s*\*\//;
    const match = modelingRegex.exec(content);
    
    if (match) {
        return {
            left: match[1],
            top: match[2],
            width: match[3],
            height: match[4]
        };
    }
    return null;
}

function parseRenameColumns(content, columns) {
    const renameColumnRegex = /\$table->renameColumn\('(\w+)', '(\w+)'\);/g;
    let match;

    while ((match = renameColumnRegex.exec(content)) !== null) {
        const [fullMatch, oldName, newName] = match;

        // Se a coluna antiga existir no JSON, renomeie-a
        if (columns[oldName]) {
            columns[newName] = { ...columns[oldName], name: newName };
            delete columns[oldName];
        }
    }

    return columns;
}

function parseRename(content) {
    const renameRegex = /Schema::rename\('(\w+)',\s*'(\w+)'\);/;
    const match = renameRegex.exec(content);
    return match ? { oldName: match[1], newName: match[2] } : null;
}

// Combina as informações de diferentes migrations
function mergeTableData(existingData, newData) {
    return {
        ...existingData,
        columns: { ...existingData.columns, ...newData.columns },
        indexes: { ...existingData.indexes, ...newData.indexes },
        fks: { ...existingData.fks, ...newData.fks },
        modeling: existingData.modeling || newData.modeling,
        file: newData.file || existingData.file
    };
}

router.get('/to-json', (req, res) => {
    const migrationsDir = path.join(process.cwd(), 'database/migrations');
    const files = fs.readdirSync(migrationsDir);
    const jsonOutput = {};

    files.forEach(file => {
        console.log(file);

        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        let tableName = parseTableName(content, 'create');
        let action = 'create';

        if (!tableName) {
            tableName = parseTableName(content, 'table');
            action = 'alter';
        }

        if (tableName) {
            let tmp = { columns: {} };
            
            if (jsonOutput[tableName]) {
                tmp = jsonOutput[tableName];
            }

            let columns = { ...tmp.columns, ...parseColumns(content) };
            const indexes = parseIndexes(content);
            const foreignKeys = parseForeignKeys(content);
            const modeling = parseModelingFromComment(content);

            // Processa renomeações de colunas
            columns = parseRenameColumns(content, columns);

            if (jsonOutput[tableName]) {
                jsonOutput[tableName].columns = columns;
            }

            const tableData = {
                name: tableName,
                columns: columns,
                indexes: indexes,
                fks: foreignKeys,
                file: file,
                modeling: modeling || { left: '50px', top: '50px', width: '200px', height: '300px' }
            };

            if (jsonOutput[tableName]) {
                jsonOutput[tableName] = mergeTableData(jsonOutput[tableName], tableData);
            } else {
                jsonOutput[tableName] = tableData;
            }
        } else {
            const renameData = parseRename(content);
            if (renameData) {
                const { oldName, newName } = renameData;
                if (jsonOutput[oldName]) {
                    jsonOutput[newName] = { ...jsonOutput[oldName], name: newName, file: file };
                    delete jsonOutput[oldName];
                }
            }
        }
    });

    res.json(jsonOutput);
});

function generateModelName(tableName) {
    // Converte o nome da tabela para PascalCase e no singular
    const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    return singularName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

function generateModelContent(tableName) {
    const modelName = generateModelName(tableName);
    return `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class ${modelName} extends Model
{
    use HasFactory;

    protected \$table = '${tableName}';
}
`;
}

function handleModelCreationOrRenaming(schema) {
    const modelsDir = path.join(process.cwd(), 'app/Models');;
    const modelName = generateModelName(schema.name);
    const modelFilePath = path.join(modelsDir, `${modelName}.php`);

    // Se a tabela foi criada ou renomeada, verifique se o modelo já existe
    if (schema.action === 'create' || schema.action === 'rename') {
        if (fs.existsSync(modelFilePath)) {
            // Modelo existe, renomear se necessário
            if (schema.action === 'rename') {
                const oldModelName = generateModelName(schema.oldName);
                const oldModelFilePath = path.join(modelsDir, `${oldModelName}.php`);
                if (fs.existsSync(oldModelFilePath)) {
                    fs.renameSync(oldModelFilePath, modelFilePath);
                    console.log(`Modelo renomeado de ${oldModelName} para ${modelName}`);
                }
            }
        } else {
            // Modelo não existe, criar novo modelo
            const modelContent = generateModelContent(schema.name);
            fs.writeFileSync(modelFilePath, modelContent);
            console.log(`Modelo ${modelName} criado`);
        }
    }
}

function generateMigrationContent(schema) {
    let migrationContent = `<?php\n\nuse Illuminate\\Database\\Migrations\\Migration;\nuse Illuminate\\Database\\Schema\\Blueprint;\nuse Illuminate\\Support\\Facades\\Schema;\n\n`;

    const className = `${schema.action.charAt(0).toUpperCase() + schema.action.slice(1)}${schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}Table`;

    migrationContent += `return new class extends Migration\n{\n`;

    // Inclui o comentário de "modeling" se disponível
    if (schema.modeling) {
        migrationContent += `    /**\n`;
        migrationContent += `    * Modeling information:\n`;
        migrationContent += `    * Left: ${schema.modeling.left}\n`;
        migrationContent += `    * Top: ${schema.modeling.top}\n`;
        migrationContent += `    * Width: ${schema.modeling.width}\n`;
        migrationContent += `    * Height: ${schema.modeling.height}\n`;
        migrationContent += `    */\n`;
    }

    migrationContent += `    public function up()\n    {\n`;

    switch (schema.action) {
        case 'create':
        case 'modeling':  // Trate "modeling" como "create" se for um arquivo de criação
            migrationContent += `        Schema::create('${schema.name}', function (Blueprint $table) {\n`;
            for (const columnName in schema.columns) {
                const column = schema.columns[columnName];
                migrationContent += `            $table->${convertMysqlToLaravelType(column.type.toLowerCase(), column.un)}('${column.name}')`;
                if (column.pk) migrationContent += '->primary()';
                if (!column.nn) migrationContent += '->nullable()';
                if (column.uq) migrationContent += '->unique()';
                if (column.ai) migrationContent += '->autoIncrement()';
                migrationContent += ';\n';
            }
            for (const fk in schema.fks) {
                const foreignKey = schema.fks[fk];
                migrationContent += `            $table->foreign('${foreignKey.column}')->references('${foreignKey.referencedColumn}')->on('${foreignKey.referencedTable}')`;
                if (foreignKey.onDelete) migrationContent += `->onDelete('${foreignKey.onDelete}')`;
                if (foreignKey.onUpdate) migrationContent += `->onUpdate('${foreignKey.onUpdate}')`;
                migrationContent += ';\n';
            }
            migrationContent += `        });\n`;
            break;

        case 'alter':
            migrationContent += `        Schema::table('${schema.name}', function (Blueprint $table) {\n`;
            for (const columnName in schema.columns) {
                const column = schema.columns[columnName];

                if (column === null) {
                    migrationContent += `            $table->dropColumn('${columnName}');\n`;
                } else {
                    migrationContent += `            $table->${convertMysqlToLaravelType(column.type.toLowerCase(), column.un)}('${column.name}')`;

                    if (column.pk) migrationContent += '->primary()';
                    if (!column.nn) migrationContent += '->nullable()';
                    if (column.uq) migrationContent += '->unique()';
                    if (column.ai) migrationContent += '->autoIncrement()';

                    migrationContent += '->change();\n';
                }
            }

            // Adiciona ou remove chaves estrangeiras
            for (const fk in schema.fks) {
                const foreignKey = schema.fks[fk];
                migrationContent += `            $table->foreign('${foreignKey.column}')->references('${foreignKey.referencedColumn}')->on('${foreignKey.referencedTable}')`;
                if (foreignKey.onDelete) migrationContent += `->onDelete('${foreignKey.onDelete}')`;
                if (foreignKey.onUpdate) migrationContent += `->onUpdate('${foreignKey.onUpdate}')`;
                migrationContent += ';\n';
            }

            migrationContent += `        });\n`;
            break;

        case 'rename':
            migrationContent += `        Schema::rename('${schema.oldName}', '${schema.name}');\n`;
            break;

        case 'remove':
            migrationContent += `        Schema::dropIfExists('${schema.name}');\n`;
            break;
    }

    migrationContent += `    }\n\n    public function down()\n    {\n`;

    switch (schema.action) {
        case 'create':
        case 'modeling':  // Reverte como se fosse uma criação
            migrationContent += `        Schema::dropIfExists('${schema.name}');\n`;
            break;

        case 'alter':
            migrationContent += `        // Reverter as mudanças feitas em up()\n`;
            break;

        case 'rename':
            migrationContent += `        Schema::rename('${schema.name}', '${schema.oldName}');\n`;
            break;

        case 'remove':
            migrationContent += `        // Adicionar código para recriar a tabela, se necessário\n`;
            break;
    }

    migrationContent += `    }\n};\n`;

    return migrationContent;
}

// Rota para gerar migrations a partir de JSON
router.post('/generate-migrations', (req, res) => {
    const modifications = req.body;  // JSON enviado no POST
    
    const migrationsDir = path.join(process.cwd(), 'database/migrations');;

    for (const fileName in modifications) {
        const migrationContent = generateMigrationContent(modifications[fileName]);
        const filePath = path.join(migrationsDir, fileName);
        fs.writeFileSync(filePath, migrationContent);

        handleModelCreationOrRenaming(modifications[fileName]);
    }

    res.status(200).json({ message: 'Migrations generated successfully', files: Object.keys(modifications) });
});

module.exports = router;
